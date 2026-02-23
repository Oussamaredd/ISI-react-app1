import { PartialType } from '@nestjs/mapped-types';

import { CreateContainerDto } from './create-container.dto.js';

export class UpdateContainerDto extends PartialType(CreateContainerDto) {}
