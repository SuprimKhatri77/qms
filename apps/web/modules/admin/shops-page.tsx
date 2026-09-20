"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { data, isPending, isError, isFetching, refetch } = useAdminShops(page);
  const updateStatus = useUpdateShopStatus();

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams);
    if (nextPage > 1) params.set("page", String(nextPage));
    else params.delete("page");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

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
  const { meta } = data;

  return (
    <>
      <PageHeader
        title="Shops"
        description={`${meta.total} shop${meta.total === 1 ? "" : "s"} on the platform`}
        actions={isFetching && !isPending ? <Spinner /> : undefined}
      />

      {shops.length === 0 ? (
        <p className="border border-hairline p-6 text-sm text-ink-mute">
          No shops have been created yet.
        </p>
      ) : (
        <>
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

          <div className="mt-4 flex items-center justify-between text-sm text-ink-mute">
            <span>
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={meta.page <= 1}
                onClick={() => goToPage(meta.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={meta.page >= meta.totalPages}
                onClick={() => goToPage(meta.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
