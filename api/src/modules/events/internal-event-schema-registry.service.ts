import { BadRequestException, Injectable } from '@nestjs/common';

import { INTERNAL_EVENT_SCHEMAS } from './internal-event-schema.catalog.js';
import type {
  InternalEventSchemaCompatibilityMode,
  InternalEventSchemaDefinition,
  InternalEventSchemaField,
  InternalEventSchemaSubject,
  InternalEventSchemaVersion,
} from './internal-events.contracts.js';

const sortVersion = (version: InternalEventSchemaVersion) =>
  version
    .slice(1)
    .split('.')
    .map((part) => Number(part))
    .reduce((total, part, index) => total + part / 10 ** index, 0);

const toFieldMap = (fields: readonly InternalEventSchemaField[]) =>
  new Map(fields.map((field) => [field.name, field]));

@Injectable()
export class InternalEventSchemaRegistryService {
  private readonly schemasBySubject = new Map<InternalEventSchemaSubject, InternalEventSchemaDefinition[]>();

  constructor() {
    for (const schema of INTERNAL_EVENT_SCHEMAS) {
      const entries = this.schemasBySubject.get(schema.subject) ?? [];
      entries.push(schema);
      entries.sort((left, right) => sortVersion(left.version) - sortVersion(right.version));
      this.schemasBySubject.set(schema.subject, entries);
    }
  }

  listSubjects() {
    return [...this.schemasBySubject.keys()].sort((left, right) => left.localeCompare(right));
  }

  listSchemas(subject: InternalEventSchemaSubject) {
    return [...(this.schemasBySubject.get(subject) ?? [])];
  }

  getLatestSchema(subject: InternalEventSchemaSubject) {
    const schemas = this.schemasBySubject.get(subject);
    const latest = schemas?.at(-1);
    if (!latest) {
      throw new BadRequestException(`Unknown internal schema subject '${subject}'.`);
    }

    return latest;
  }

  getSchema(subject: InternalEventSchemaSubject, version: InternalEventSchemaVersion) {
    const schema = this.listSchemas(subject).find((entry) => entry.version === version);
    if (!schema) {
      throw new BadRequestException(
        `Unknown internal schema version '${version}' for subject '${subject}'.`,
      );
    }

    return schema;
  }

  assertSchemaVersionRegistered(
    subject: InternalEventSchemaSubject,
    version: InternalEventSchemaVersion,
  ) {
    return this.getSchema(subject, version);
  }

  assertCandidateCompatible(candidate: InternalEventSchemaDefinition) {
    const latest = this.getLatestSchema(candidate.subject);
    const compatible = this.isCompatible(latest, candidate, latest.compatibility);
    if (!compatible) {
      throw new BadRequestException(
        `Schema candidate '${candidate.subject}@${candidate.version}' is not ${latest.compatibility.toLowerCase()} compatible with '${latest.version}'.`,
      );
    }

    return true;
  }

  isCompatible(
    previous: InternalEventSchemaDefinition,
    candidate: InternalEventSchemaDefinition,
    compatibility: InternalEventSchemaCompatibilityMode,
  ) {
    if (compatibility === 'BACKWARD') {
      return this.isBackwardCompatible(previous, candidate);
    }

    if (compatibility === 'FORWARD') {
      return this.isForwardCompatible(previous, candidate);
    }

    return (
      this.isBackwardCompatible(previous, candidate) &&
      this.isForwardCompatible(previous, candidate)
    );
  }

  private isBackwardCompatible(
    previous: InternalEventSchemaDefinition,
    candidate: InternalEventSchemaDefinition,
  ) {
    const previousFields = toFieldMap(previous.fields);
    const candidateFields = toFieldMap(candidate.fields);

    for (const [name, field] of previousFields.entries()) {
      const nextField = candidateFields.get(name);
      if (!nextField) {
        return false;
      }

      if (nextField.type !== field.type) {
        return false;
      }
    }

    for (const field of candidate.fields) {
      if (!previousFields.has(field.name) && field.required && !field.hasDefault) {
        return false;
      }
    }

    return true;
  }

  private isForwardCompatible(
    previous: InternalEventSchemaDefinition,
    candidate: InternalEventSchemaDefinition,
  ) {
    const previousFields = toFieldMap(previous.fields);

    for (const field of previous.fields) {
      const nextField = candidate.fields.find((entry) => entry.name === field.name);
      if (!nextField || nextField.type !== field.type) {
        return false;
      }
    }

    for (const field of candidate.fields) {
      if (!previousFields.has(field.name) && field.required && !field.hasDefault) {
        return false;
      }
    }

    return true;
  }
}
