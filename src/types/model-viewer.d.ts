// Type shim for the <model-viewer> custom element (from @google/model-viewer).
// It's a Web Component, so TSX needs to be told the tag exists. We only
// declare the handful of attributes PetModel sets directly in JSX; the rest
// are applied imperatively via setAttribute, so they don't need typing here.
import type * as React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          ref?: React.Ref<HTMLElement>;
          src?: string;
          alt?: string;
          poster?: string;
        },
        HTMLElement
      >;
    }
  }
}
