import { apiClient } from "@api/core/http";

export type ContainerOption = {
  id: string;
  code: string;
  label: string;
  status?: string | null;
  zoneId?: string | null;
  zoneName?: string | null;
  fillLevelPercent?: number | null;
  latitude?: string | null;
  longitude?: string | null;
};

export type ContainersResponse = {
  containers: ContainerOption[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
  };
};

type ListContainersOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export const containersApi = {
  list: ({ page = 1, pageSize = 12, search, status }: ListContainersOptions = {}) => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(page));
    searchParams.set("pageSize", String(pageSize));

    if (search) {
      searchParams.set("q", search);
    }

    if (status) {
      searchParams.set("status", status);
    }

    return apiClient.get<ContainersResponse>(`/api/containers?${searchParams.toString()}`);
  }
};
