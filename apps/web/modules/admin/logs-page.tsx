"use client";

import { useState } from "react";
import type { LogLevel } from "@repo/types";
import { LOG_LEVELS, LOG_LEVEL_LABELS } from "@repo/types";
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
import { useSystemLogs } from "./hooks/queries/useSystemLogs";

const LEVEL_BADGE_VARIANT: Record<
  LogLevel,
  "outline" | "secondary" | "destructive"
> = {
  info: "outline",
  warning: "secondary",
  error: "destructive",
};

export function LogsPage() {
  const [level, setLevel] = useState<LogLevel | undefined>(undefined);
  const [page, setPage] = useState(1);
  const { data, isPending, isError, isFetching, refetch } = useSystemLogs(
    level,
    page,
  );

  function changeLevel(nextLevel: LogLevel | undefined) {
    setLevel(nextLevel);
    setPage(1);
  }

  const levelPicker = (
    <div className="flex items-center gap-2">
      {isFetching && !isPending ? <Spinner /> : null}
      <div role="group" aria-label="Level" className="flex">
        <Button
          variant={level === undefined ? "default" : "outline"}
          aria-pressed={level === undefined}
          onClick={() => changeLevel(undefined)}
        >
          All
        </Button>
        {LOG_LEVELS.map((option) => (
          <Button
            key={option}
            variant={level === option ? "default" : "outline"}
            aria-pressed={level === option}
            onClick={() => changeLevel(option)}
          >
            {LOG_LEVEL_LABELS[option]}
          </Button>
        ))}
      </div>
    </div>
  );

  if (isPending) {
    return (
      <>
        <PageHeader title="Logs" actions={levelPicker} />
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-mute">
          <Spinner />
          Loading logs...
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Logs" actions={levelPicker} />
        <div className="border border-hairline p-6 text-sm">
          <p className="text-ink">Couldn&apos;t load logs.</p>
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

  const { logs } = data.data;
  const { meta } = data;

  return (
    <>
      <PageHeader
        title="Logs"
        description="Things that failed outside a request a user was waiting on, most recent first."
        actions={levelPicker}
      />

      {logs.length === 0 ? (
        <p className="border border-hairline p-6 text-sm text-ink-mute">
          Nothing logged yet.
        </p>
      ) : (
        <>
          <div className="border border-hairline">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={LEVEL_BADGE_VARIANT[log.level]}>
                        {LOG_LEVEL_LABELS[log.level]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-ink-mute">
                      {log.source}
                    </TableCell>
                    <TableCell>
                      <div className="text-ink">{log.message}</div>
                      {log.meta ? (
                        <div className="mt-1 font-mono text-xs text-ink-mute">
                          {JSON.stringify(log.meta)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-ink-mute">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-ink-mute">
            <span>
              Page {meta.page} of {meta.totalPages} · {meta.total} entr
              {meta.total === 1 ? "y" : "ies"}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={meta.page <= 1}
                onClick={() => setPage(meta.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage(meta.page + 1)}
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
