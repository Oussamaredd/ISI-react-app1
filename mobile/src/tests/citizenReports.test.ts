import { describe, expect, it } from "vitest";

import {
  buildCapturedPhotoDataUrl,
  buildMapRegion,
  findRecentDuplicateHistoryItem,
  formatCitizenReportTypeLabel,
  formatRelativeReportTime,
  mergeContainerCollections,
  resolveNearestContainer
} from "@/lib/citizenReports";

describe("citizenReports helpers", () => {
  it("builds a data URL from captured photo evidence", () => {
    expect(
      buildCapturedPhotoDataUrl({
        uri: "file://photo.jpg",
        width: 100,
        height: 100,
        mimeType: "image/jpeg",
        base64: "YWJj"
      })
    ).toBe("data:image/jpeg;base64,YWJj");
  });

  it("creates a map region and resolves the nearest container", () => {
    const containers = [
      {
        id: "container-a",
        code: "CTR-1001",
        label: "Downtown",
        latitude: "48.8566",
        longitude: "2.3522"
      },
      {
        id: "container-b",
        code: "CTR-1002",
        label: "Harbor",
        latitude: "48.8362",
        longitude: "2.3700"
      }
    ];

    expect(buildMapRegion(containers[0])).toEqual(
      expect.objectContaining({
        latitude: 48.8566,
        longitude: 2.3522
      })
    );
    expect(resolveNearestContainer(containers, containers[0])?.id).toBe("container-a");
  });

  it("merges containers and formats known report types", () => {
    const merged = mergeContainerCollections(
      [
        {
          id: "container-a",
          code: "CTR-1001",
          label: "Downtown"
        }
      ],
      [
        {
          id: "container-a",
          code: "CTR-1001",
          label: "Downtown updated"
        },
        {
          id: "container-b",
          code: "CTR-1002",
          label: "Harbor"
        }
      ]
    );

    expect(merged).toHaveLength(2);
    expect(merged[0]?.label).toBe("Downtown updated");
    expect(formatCitizenReportTypeLabel("container_full")).toBe("Conteneur plein");
  });

  it("tracks recent selections and detects duplicate reports within one hour", () => {
    const now = new Date("2026-03-11T12:00:00.000Z").getTime();
    const duplicate = findRecentDuplicateHistoryItem(
      [
        {
          containerId: "container-a",
          reportedAt: "2026-03-11T11:20:00.000Z"
        },
        {
          containerId: "container-b",
          reportedAt: "2026-03-11T09:00:00.000Z"
        }
      ],
      "container-a",
      now
    );

    expect(duplicate?.containerId).toBe("container-a");
    expect(formatRelativeReportTime("2026-03-11T11:45:00.000Z", now)).toBe("15 min ago");
  });
});
