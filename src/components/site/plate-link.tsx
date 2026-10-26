import type { ComponentType, ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export type PlateLinkProps = {
  plateId: string;
  className: string;
  children: ReactNode;
  onClick?: (() => void) | undefined;
};

/** How a screen links to a plate page; the sample gallery swaps in its own destination. */
export type PlateLinkComponent = ComponentType<PlateLinkProps>;

export function LivePlateLink({ plateId, className, children, onClick }: PlateLinkProps) {
  return (
    <Link to="/plate/$state" params={{ state: plateId }} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}
