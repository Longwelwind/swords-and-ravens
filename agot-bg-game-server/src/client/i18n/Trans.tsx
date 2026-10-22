import React from "react";
import { Trans as ReactTrans, TransProps, useTranslation } from "react-i18next";
import type { TOptions } from "i18next";
import type { TranslationKey } from ".";

type RichTextOptions = TOptions & { context?: undefined };
type Props = Omit<
  TransProps<string, "translation", undefined, undefined, RichTextOptions>,
  "i18nKey"
> & {
  i18nKey: TranslationKey;
};

export default function Trans(props: Props): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <ReactTrans<string, "translation", undefined, undefined, RichTextOptions>
      {...props}
      t={t}
      // Interpolate after parsing rich-text tags so player names remain literal text.
      tOptions={{
        ...props.tOptions,
        skipInterpolation:
          props.components || props.children
            ? true
            : props.tOptions?.skipInterpolation
      }}
    />
  );
}
