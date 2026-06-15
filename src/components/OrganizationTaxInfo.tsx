import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OrgInfo {
  organization_name: string | null;
  organization_ein: string | null;
  organization_address: string | null;
}

interface OrganizationTaxInfoProps {
  /** "donation" | "sponsorship" | "contribution" — used in the tax-deductible sentence */
  contributionType?: string;
  className?: string;
}

/**
 * Small reusable block shown on giving pages with the organization's
 * legal name, EIN, and tax-deductible status. Data is pulled from
 * the `receipt_settings` table so it stays in sync with receipts.
 */
export const OrganizationTaxInfo = ({
  contributionType = "contribution",
  className = "",
}: OrganizationTaxInfoProps) => {
  const [info, setInfo] = useState<OrgInfo | null>(null);

  useEffect(() => {
    supabase
      .from("receipt_settings")
      .select("organization_name, organization_ein, organization_address")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setInfo(data as OrgInfo);
      });
  }, []);

  if (!info?.organization_name) return null;

  return (
    <div
      className={`text-xs text-muted-foreground text-center space-y-1 pt-2 ${className}`}
    >
      <p>
        <span className="font-semibold text-foreground">
          {info.organization_name}
        </span>
        {info.organization_ein && (
          <>
            {" "}· EIN{" "}
            <span className="font-mono">{info.organization_ein}</span>
          </>
        )}
      </p>
      {info.organization_address && <p>{info.organization_address}</p>}
      <p>
        {info.organization_name} is a church under section 508(c)(1)(A) of the
        Internal Revenue Code. Your {contributionType} may be tax-deductible to
        the extent allowed by law.
      </p>
    </div>
  );
};

export default OrganizationTaxInfo;
