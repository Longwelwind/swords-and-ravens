import React from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { languages, useTranslation } from ".";
import LanguageFlag from "./LanguageFlag";

export default function LanguageSelector(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const selected =
    languages.find(({ code }) => code === i18n.resolvedLanguage) ??
    languages[0];

  return (
    <Dropdown>
      <Dropdown.Toggle
        id="game-language-selector"
        size="sm"
        variant="outline-light"
        aria-label={`${t("language")}: ${selected.name}`}
        title={t("language")}
      >
        <LanguageFlag language={selected.code} />
        <span lang={selected.code === "zh" ? "zh-Hans" : selected.code}>
          {selected.name}
        </span>
      </Dropdown.Toggle>
      <Dropdown.Menu align="end" role="menu">
        {languages.map(({ code, name }) => (
          <Dropdown.Item
            as="button"
            key={code}
            active={code === selected.code}
            role="menuitemradio"
            aria-checked={code === selected.code}
            onClick={() => void i18n.changeLanguage(code)}
          >
            <LanguageFlag language={code} />
            <span lang={code === "zh" ? "zh-Hans" : code}>{name}</span>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
