import { useEffect } from "react";

type JsonLd = Record<string, unknown>;

type DocumentMetadataProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  robots?: string;
  imagePath?: string;
  imageAlt?: string;
  openGraphType?: "article" | "profile" | "website";
  structuredData?: JsonLd | JsonLd[];
};

const DESCRIPTION_META_NAME = "description";
const CANONICAL_REL = "canonical";
const DEFAULT_SITE_NAME = "EcoTrack";
const DEFAULT_SOCIAL_IMAGE_PATH = "/ecotrack-icon-512.png";
const DEFAULT_SOCIAL_IMAGE_ALT = "EcoTrack logo";
const METADATA_SCRIPT_ATTRIBUTE = "data-ecotrack-metadata";

const ensureMetaTag = (identifier: { name: string } | { property: string }) => {
  const attributeName = "name" in identifier ? "name" : "property";
  const attributeValue = "name" in identifier ? identifier.name : identifier.property;
  let metaTag = document.head.querySelector<HTMLMetaElement>(
    `meta[${attributeName}="${attributeValue}"]`,
  );
  const existed = Boolean(metaTag);

  if (!metaTag) {
    metaTag = document.createElement("meta");
    metaTag.setAttribute(attributeName, attributeValue);
    document.head.append(metaTag);
  }

  return { metaTag, existed };
};

const ensureCanonicalLink = () => {
  let linkTag = document.head.querySelector<HTMLLinkElement>(
    `link[rel="${CANONICAL_REL}"]`,
  );
  const existed = Boolean(linkTag);

  if (!linkTag) {
    linkTag = document.createElement("link");
    linkTag.rel = CANONICAL_REL;
    document.head.append(linkTag);
  }

  return { linkTag, existed };
};

export default function DocumentMetadata({
  title,
  description,
  canonicalPath,
  robots,
  imagePath = DEFAULT_SOCIAL_IMAGE_PATH,
  imageAlt = DEFAULT_SOCIAL_IMAGE_ALT,
  openGraphType = "website",
  structuredData,
}: DocumentMetadataProps) {
  useEffect(() => {
    const previousTitle = document.title;
    const restoreCallbacks: Array<() => void> = [];
    const pageUrl = new URL(canonicalPath ?? window.location.pathname, window.location.origin).toString();
    const socialImageUrl = new URL(imagePath, window.location.origin).toString();
    const structuredDataItems = Array.isArray(structuredData)
      ? structuredData
      : structuredData
        ? [structuredData]
        : [];

    const setMetaContent = (
      identifier: { name: string } | { property: string },
      content: string,
    ) => {
      const { metaTag, existed } = ensureMetaTag(identifier);
      const previousContent = metaTag.getAttribute("content");

      metaTag.setAttribute("content", content);

      restoreCallbacks.push(() => {
        if (!existed) {
          metaTag.remove();
          return;
        }

        if (previousContent !== null) {
          metaTag.setAttribute("content", previousContent);
        } else {
          metaTag.removeAttribute("content");
        }
      });
    };

    document.title = title;
    setMetaContent({ name: DESCRIPTION_META_NAME }, description);
    setMetaContent({ property: "og:title" }, title);
    setMetaContent({ property: "og:description" }, description);
    setMetaContent({ property: "og:type" }, openGraphType);
    setMetaContent({ property: "og:url" }, pageUrl);
    setMetaContent({ property: "og:site_name" }, DEFAULT_SITE_NAME);
    setMetaContent({ property: "og:image" }, socialImageUrl);
    setMetaContent({ property: "og:image:alt" }, imageAlt);
    setMetaContent({ name: "twitter:card" }, "summary");
    setMetaContent({ name: "twitter:title" }, title);
    setMetaContent({ name: "twitter:description" }, description);
    setMetaContent({ name: "twitter:image" }, socialImageUrl);
    setMetaContent({ name: "twitter:image:alt" }, imageAlt);

    if (robots) {
      setMetaContent({ name: "robots" }, robots);
    }

    let canonicalLink: HTMLLinkElement | null = null;
    let previousCanonicalHref: string | null = null;
    let canonicalLinkExisted = false;

    if (canonicalPath) {
      const canonicalResult = ensureCanonicalLink();
      canonicalLink = canonicalResult.linkTag;
      canonicalLinkExisted = canonicalResult.existed;
      previousCanonicalHref = canonicalLink.getAttribute("href");
      canonicalLink.setAttribute("href", pageUrl);
    }

    const insertedStructuredDataScripts = structuredDataItems.map((item) => {
      const scriptTag = document.createElement("script");
      scriptTag.type = "application/ld+json";
      scriptTag.setAttribute(METADATA_SCRIPT_ATTRIBUTE, "true");
      scriptTag.text = JSON.stringify(item);
      document.head.append(scriptTag);
      return scriptTag;
    });

    restoreCallbacks.push(() => {
      insertedStructuredDataScripts.forEach((scriptTag) => scriptTag.remove());
    });

    restoreCallbacks.push(() => {
      if (!canonicalLink) {
        return;
      }

      if (!canonicalLinkExisted) {
        canonicalLink.remove();
        return;
      }

      if (previousCanonicalHref !== null) {
        canonicalLink.setAttribute("href", previousCanonicalHref);
      } else {
        canonicalLink.removeAttribute("href");
      }
    });

    restoreCallbacks.push(() => {
      document.title = previousTitle;
    });

    return () => {
      while (restoreCallbacks.length > 0) {
        const restore = restoreCallbacks.pop();
        restore?.();
      }
    };
  }, [
    canonicalPath,
    description,
    imageAlt,
    imagePath,
    openGraphType,
    robots,
    structuredData,
    title,
  ]);

  return null;
}
