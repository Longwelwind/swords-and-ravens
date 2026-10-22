import React from "react";
import type { Language } from ".";

const flags: Record<Language, React.ReactNode> = {
  en: (
    <>
      <path fill="#012169" d="M0 0h60v40H0z" />
      <path d="m0 0 60 40M60 0 0 40" stroke="#fff" strokeWidth="8" />
      <path d="m0 0 60 40M60 0 0 40" stroke="#c8102e" strokeWidth="3" />
      <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="13" />
      <path d="M30 0v40M0 20h60" stroke="#c8102e" strokeWidth="8" />
    </>
  ),
  de: (
    <>
      <path fill="#000" d="M0 0h60v14H0z" />
      <path fill="#d00" d="M0 13.33h60v14H0z" />
      <path fill="#ffce00" d="M0 26.67h60V40H0z" />
    </>
  ),
  es: (
    <>
      <path fill="#aa151b" d="M0 0h60v40H0z" />
      <path fill="#f1bf00" d="M0 10h60v20H0z" />
    </>
  ),
  it: (
    <>
      <path fill="#009246" d="M0 0h20v40H0z" />
      <path fill="#fff" d="M20 0h20v40H20z" />
      <path fill="#ce2b37" d="M40 0h20v40H40z" />
    </>
  ),
  fr: (
    <>
      <path fill="#002395" d="M0 0h20v40H0z" />
      <path fill="#fff" d="M20 0h20v40H20z" />
      <path fill="#ed2939" d="M40 0h20v40H40z" />
    </>
  ),
  pt: (
    <>
      <path fill="#006600" d="M0 0h24v40H0z" />
      <path fill="#ff0000" d="M24 0h36v40H24z" />
      <g fill="none" stroke="#ffcc00" strokeWidth="1">
        <circle cx="24" cy="20" r="7" />
        <ellipse cx="24" cy="20" rx="7" ry="3" />
        <ellipse cx="24" cy="20" rx="3" ry="7" />
      </g>
      <path
        fill="#fff"
        stroke="#ff0000"
        strokeWidth="2"
        d="M20 15h8v8c0 2-4 4-4 4s-4-2-4-4z"
      />
      <path
        fill="#003399"
        d="M23.3 17h1.4v2h-1.4zm-2 3h1.4v2h-1.4zm4 0h1.4v2h-1.4zm-2 0h1.4v2h-1.4zm0 3h1.4v2h-1.4z"
      />
    </>
  ),
  ru: (
    <>
      <path fill="#fff" d="M0 0h60v14H0z" />
      <path fill="#0039a6" d="M0 13.33h60v14H0z" />
      <path fill="#d52b1e" d="M0 26.67h60V40H0z" />
    </>
  ),
  zh: (
    <>
      <path fill="#de2910" d="M0 0h60v40H0z" />
      <g fill="#ffde00">
        <path d="m10 4 1.4 4.1h4.3l-3.5 2.6 1.3 4.1-3.5-2.5-3.5 2.5 1.3-4.1-3.5-2.6h4.3z" />
        <path d="m20 3 .5 1.4H22l-1.2.9.5 1.4-1.3-.8-1.2.8.5-1.4-1.2-.9h1.5z" />
        <path d="m24 7 .5 1.4H26l-1.2.9.5 1.4-1.3-.8-1.2.8.5-1.4-1.2-.9h1.5z" />
        <path d="m24 13 .5 1.4H26l-1.2.9.5 1.4-1.3-.8-1.2.8.5-1.4-1.2-.9h1.5z" />
        <path d="m20 17 .5 1.4H22l-1.2.9.5 1.4-1.3-.8-1.2.8.5-1.4-1.2-.9h1.5z" />
      </g>
    </>
  ),
  nl: (
    <>
      <path fill="#ae1c28" d="M0 0h60v13.33H0z" />
      <path fill="#fff" d="M0 13.33h60v13.34H0z" />
      <path fill="#21468b" d="M0 26.67h60V40H0z" />
    </>
  ),
  pl: (
    <>
      <path fill="#fff" d="M0 0h60v20H0z" />
      <path fill="#dc143c" d="M0 20h60v20H0z" />
    </>
  ),
  cs: (
    <>
      <path fill="#fff" d="M0 0h60v20H0z" />
      <path fill="#d7141a" d="M0 20h60v20H0z" />
      <path fill="#11457e" d="M0 0 30 20 0 40z" />
    </>
  ),
  ja: (
    <>
      <path fill="#fff" d="M0 0h60v40H0z" />
      <circle cx="30" cy="20" r="9" fill="#bc002d" />
    </>
  ),
  tr: (
    <>
      <path fill="#e30a17" d="M0 0h60v40H0z" />
      <circle cx="26" cy="20" r="11" fill="#fff" />
      <circle cx="29" cy="20" r="9" fill="#e30a17" />
      <path
        fill="#fff"
        d="m40 12 2.2 5.4 5.8.4-4.5 3.6 1.5 5.6-5-3.1-4.9 3.1 1.5-5.6-4.5-3.6 5.8-.4z"
      />
    </>
  ),
  uk: (
    <>
      <path fill="#0057b7" d="M0 0h60v20H0z" />
      <path fill="#ffd700" d="M0 20h60v20H0z" />
    </>
  ),
  sv: (
    <>
      <path fill="#006aa7" d="M0 0h60v40H0z" />
      <path fill="#fecc00" d="M18 0h6v40h-6zM0 17h60v6H0z" />
    </>
  ),
  no: (
    <>
      <path fill="#ba0c2f" d="M0 0h60v40H0z" />
      <path fill="#fff" d="M15 0h12v40H15zM0 14h60v12H0z" />
      <path fill="#00205b" d="M18 0h6v40h-6zM0 17h60v6H0z" />
    </>
  ),
  hu: (
    <>
      <path fill="#ce2939" d="M0 0h60v13.33H0z" />
      <path fill="#fff" d="M0 13.33h60v13.34H0z" />
      <path fill="#477050" d="M0 26.67h60V40H0z" />
    </>
  ),
  ko: (
    <>
      <path fill="#fff" d="M0 0h60v40H0z" />
      <path fill="#cd2e3a" d="M21 20a9 9 0 0 1 18 0v4H21z" />
      <path fill="#0047a0" d="M21 20a9 9 0 0 0 18 0H21z" />
      <circle cx="25.5" cy="20" r="4.5" fill="#cd2e3a" />
      <circle cx="34.5" cy="20" r="4.5" fill="#0047a0" />
      <g stroke="#000" strokeWidth="2">
        <path d="m8 11 6-6m-4 8 6-6m-4 8 6-6" />
        <path d="m42 31 2-2m2-2 2-2m-4 8 2-2m2-2 2-2m-4 8 2-2m2-2 2-2" />
        <path d="m42 5 6 6m-8-4 2 2m2 2 2 2m-8-4 6 6" />
        <path d="m8 29 2 2m2 2 2 2m-4-8 6 6m-4-8 2 2m2 2 2 2" />
      </g>
    </>
  )
};

export default function LanguageFlag({
  language
}: {
  language: Language;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 60 40"
      width="21"
      height="14"
      className="me-2 rounded-1"
      aria-hidden="true"
      focusable="false"
      style={{ verticalAlign: "-0.1em" }}
    >
      {flags[language]}
    </svg>
  );
}
