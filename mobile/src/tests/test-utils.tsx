import type { ReactElement } from "react";
import { fireEvent } from "@testing-library/dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

type MountedRoot = {
  container: HTMLDivElement;
  root: Root;
};

const mountedRoots: MountedRoot[] = [];

export const cleanupMobileScreens = () => {
  while (mountedRoots.length > 0) {
    const mountedRoot = mountedRoots.pop();

    if (!mountedRoot) {
      continue;
    }

    act(() => {
      mountedRoot.root.unmount();
    });
    mountedRoot.container.remove();
  }
};

export const renderMobileScreen = (ui: ReactElement) => {
  const container = document.createElement("div");
  const root = createRoot(container);

  document.body.appendChild(container);

  act(() => {
    root.render(ui);
  });

  mountedRoots.push({
    container,
    root,
  });

  return {
    container,
    rerender: (nextUi: ReactElement) => {
      act(() => {
        root.render(nextUi);
      });
    },
    unmount: () => {
      const mountedRootIndex = mountedRoots.findIndex(
        (mountedRoot) => mountedRoot.root === root,
      );

      act(() => {
        root.unmount();
      });
      container.remove();

      if (mountedRootIndex >= 0) {
        mountedRoots.splice(mountedRootIndex, 1);
      }
    },
  };
};

export const renderMobileScreenAsync = async (ui: ReactElement) => {
  const container = document.createElement("div");
  const root = createRoot(container);

  document.body.appendChild(container);

  await act(async () => {
    root.render(ui);
  });

  mountedRoots.push({
    container,
    root,
  });

  return {
    container,
    rerender: async (nextUi: ReactElement) => {
      await act(async () => {
        root.render(nextUi);
      });
    },
    unmount: () => {
      const mountedRootIndex = mountedRoots.findIndex(
        (mountedRoot) => mountedRoot.root === root,
      );

      act(() => {
        root.unmount();
      });
      container.remove();

      if (mountedRootIndex >= 0) {
        mountedRoots.splice(mountedRootIndex, 1);
      }
    },
  };
};

export const mobileFireEvent = {
  change: async (element: Element, event: Event | object) => {
    await act(async () => {
      fireEvent.change(element, event);
    });
  },
  click: async (element: Element) => {
    await act(async () => {
      fireEvent.click(element);
    });
  },
};
