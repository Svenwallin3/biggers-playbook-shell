import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  blockLabels,
  certExpiryState,
  certHolders,
  kitchenSchedule,
  type ShiftBlock,
} from "@/data/mockCompliance";

export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance & Staffing — Biggers Training" },
      {
        name: "description",
        content:
          "CFPM and ServSafe certification holders with expiry dates, cross-referenced against the weekday production and weekend service kitchen schedule.",
      },
      { property: "og:title", content: "Compliance & Staffing — Biggers Training" },
      {
        property: "og:description",
        content: "Certified coverage check for every day of the Biggers Kitchen schedule.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompliancePage,
});

function holder(id: string) {
  return certHolders.find((c) => c.id === id);
}

function ExpiryBadge({ expires }: { expires: string }) {
  const state = certExpiryState(expires);
  if (state === "expired") return <Badge variant="destructive">Expired</Badge>;
  if (state === "expiring") return <Badge variant="secondary">Expires soon</Badge>;
  return <Badge variant="outline">Current</Badge>;
}

function CompliancePage() {
  const blocks: ShiftBlock[] = ["weekday_production", "weekend_service"];

  const days = kitchenSchedule.map((d) => {
    const staff = d.staffIds.map(holder).filter(Boolean) as NonNullable<
      ReturnType<typeof holder>
    >[];
    const cfpm = staff.filter((s) => s.cert === "CFPM" && certExpiryState(s.expires) !== "expired");
    return { ...d, staff, cfpm };
  });

  const uncovered = days.filter((d) => d.cfpm.length === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compliance &amp; staffing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          NC requires a current CFPM on-site during all Kitchen operating hours. This checks the
          schedule against who actually holds one.
        </p>
      </div>

      {uncovered.length > 0 ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4 text-sm">
            <span className="font-medium">No certified CFPM coverage on: </span>
            {uncovered.map((d) => d.day).join(", ")}. Fix the schedule before those shifts run.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 text-sm">
            Every scheduled day has at least one current CFPM on-site.
          </CardContent>
        </Card>
      )}

      {blocks.map((block) => (
        <Card key={block}>
          <CardHeader>
            <CardTitle className="text-base">{blockLabels[block]}</CardTitle>
            <CardDescription>Scheduled kitchen staff and certified coverage.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>CFPM on-site</TableHead>
                  <TableHead className="text-right">Coverage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days
                  .filter((d) => d.block === block)
                  .map((d) => (
                    <TableRow key={d.day} className={d.cfpm.length === 0 ? "bg-destructive/5" : undefined}>
                      <TableCell className="font-medium">{d.day}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.staff.map((s) => s.name).join(", ") || "Nobody scheduled"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.cfpm.map((s) => s.name).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {d.cfpm.length === 0 ? (
                          <Badge variant="destructive">No coverage</Badge>
                        ) : (
                          <Badge variant="outline">Covered</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certification holders</CardTitle>
          <CardDescription>CFPM and ServSafe Food Handler, with expiry dates.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Certification</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certHolders.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.role}</TableCell>
                  <TableCell>{c.cert}</TableCell>
                  <TableCell className="text-muted-foreground">{c.certNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{c.expires}</TableCell>
                  <TableCell className="text-right">
                    <ExpiryBadge expires={c.expires} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}