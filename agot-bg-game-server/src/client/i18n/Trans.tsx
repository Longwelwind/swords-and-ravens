import React from "react";
import { Trans as ReactTrans, TransProps, useTranslation } from "react-i18next";
import type { TranslationKey } from ".";

type Props = Omit<TransProps<string>, "i18nKey"> & {
  i18nKey: TranslationKey;
};

export default function Trans(props: Props): React.JSX.Element {
  const { t } = useTranslation();
  return <ReactTrans<string> {...props} t={t} />;
}
