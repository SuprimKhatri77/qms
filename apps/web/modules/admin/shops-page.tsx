"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/modules/dashboard/page-header";
import { useAdminShops } from "./hooks/queries/useAdminShops";
import { useUpdateShopStatus } from "./hooks/mutations/useUpdateShopStatus";

export function ShopsPage() {
  const { data, isPending, isError, refetch } = useAdminShops();
  const updateStatus = useUpdateShopStatus();

  if (isPending) {
    return (
      <>
        <PageHeader title="Shops" />
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-mute">
          <Spinner />
          Loading shops...
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Shops" />
        <div className="border border-hairline p-6 text-sm">
          <p className="text-ink">Couldn&apos;t load shops.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </div>
      </>
    );
  }

  const { shops } = data.data;

  return (
    <>
      <PageHeader
        title="Shops"
        description={`${shops.length} shop${shops.length === 1 ? "" : "s"} on the platform`}
      />

      {shops.length === 0 ? (
        <p className="border border-hairline p-6 text-sm text-ink-mute">
          No shops have been created yet.
        </p>
      ) : (
        <div className="border border-hairline">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">Tickets</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shops.map((shop) => {
                const isPendingThisShop =
                  updateStatus.isPending &&
                  updateStatus.variables?.shopId === shop.id;
                const nextStatus =
                  shop.status === "active" ? "suspended" : "active";

                return (
                  <TableRow key={shop.id}>
                    <TableCell className="font-medium text-ink">
                      {shop.name}
                    </TableCell>
                    <TableCell>
                      <div className="text-ink">{shop.ownerName}</div>
                      <div className="text-xs text-ink-mute">
                        {shop.ownerEmail}
                      </div>
                    </TableCell>
                    <TableCell>{shop.city}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {shop.ticketCount}
                    </TableCell>
                    <TableCell>{formatDateTime(shop.createdAt)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          shop.status === "active" ? "default" : "destructive"
                        }
                      >
                        {shop.status === "active" ? "Active" : "Suspended"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        disabled={isPendingThisShop}
                        onClick={() =>
                          updateStatus.mutate({
                            shopId: shop.id,
                            status: nextStatus,
                          })
                        }
                      >
                        {isPendingThisShop ? (
                          <Spinner />
                        ) : shop.status === "active" ? (
                          "Suspend"
                        ) : (
                          "Reactivate"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
