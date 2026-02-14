export function scrollPageToTop(behavior: ScrollBehavior = "auto") {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const scrollOptions: ScrollToOptions = {
    top: 0,
    left: 0,
    behavior,
  };

  if (typeof window.scrollTo === "function") {
    window.scrollTo(scrollOptions);
  }

  const rootScrollElement = document.scrollingElement;
  if (rootScrollElement && typeof rootScrollElement.scrollTo === "function") {
    rootScrollElement.scrollTo(scrollOptions);
    return;
  }

  if (document.documentElement) {
    document.documentElement.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
  }

  if (document.body) {
    document.body.scrollTop = 0;
    document.body.scrollLeft = 0;
  }
}
