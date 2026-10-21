import { useTranslation } from "../i18n";
import React, { ReactNode } from "react";
import classNames from "classnames";
import { useStickToBottom } from "use-stick-to-bottom";

interface AutoScrollProps {
  children: ReactNode;
  className?: string;
  scrollViewClassName?: string;
  initialScrollBehavior?: "auto" | "smooth";
}

export default function AutoScroll({
  children,
  className,
  scrollViewClassName,
  initialScrollBehavior = "smooth"
}: AutoScrollProps): React.JSX.Element {
  const { t } = useTranslation();
  const { scrollRef, contentRef, isAtBottom, scrollToBottom } =
    useStickToBottom({
      initial: initialScrollBehavior === "auto" ? "instant" : "smooth",
      resize: "smooth"
    });

  return (
    <div className={classNames("auto-scroll position-relative", className)}>
      <div
        ref={scrollRef}
        className={classNames("auto-scroll-viewport", scrollViewClassName)}
      >
        <div ref={contentRef}>{children}</div>
      </div>
      {!isAtBottom && (
        <button
          type="button"
          className="auto-scroll-follow btn btn-secondary rounded-circle"
          aria-label={t("autoScroll.scrollToLatest60df3c")}
          onClick={() => void scrollToBottom()}
        >
          <span aria-hidden="true">&#8595;</span>
        </button>
      )}
    </div>
  );
}
