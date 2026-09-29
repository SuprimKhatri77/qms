import { and, count, eq, lt, sql } from "drizzle-orm";
import type { CreateShopRequest } from "@repo/types";
import { db } from "@/db";
import { queues, tickets, users } from "@/db/schema";
import type { shops } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createShop } from "@/services/shops/create-shop.service";
import { getOwnerShop } from "@/services/shops/get-owner-shop";
import { findOrCreateTodaysQueue } from "@/services/queue/find-or-create-queue";
import { addDays, getShopLocalDate } from "@/services/queue/local-date";

// Demo data for a fresh database, so the admin panel, /explore, analytics
// and history all have something to show. Run through seed.ts, which checks
// it is safe to run first.
//
// Every step first checks whether its data is already there and skips it if
// so, which makes the seed safe to run again: nothing is duplicated.
//
// All emails use the reserved `.test` domain, which can never belong to a
// real person, so nothing the app sends to these accounts reaches anyone.

type DemoOwner = {
  email: string;
  name: string;
  shop: CreateShopRequest;
};

const SUPERADMIN = {
  email: "superadmin@palo.test",
  name: "Palo Superadmin",
};

// Four shops across Kathmandu and Pokhara in different categories, so the
// /explore page's city, category and "near me" filters all return results.
// The first owner's shop also gets the queue history below.
const DEMO_OWNERS: DemoOwner[] = [
  {
    email: "owner@palo.test",
    name: "Hari Shrestha",
    shop: {
      name: "Hari's Barber Studio",
      category: "barber",
      city: "Kathmandu",
      area: "Thamel",
      address: "Chaksibari Marg, Thamel",
      lat: 27.7154,
      lng: 85.3123,
      avgServiceMinutes: 15,
      // No closing time, so the queue only closes at midnight. Otherwise the
      // expiry sweep could close today's demo queue (and expire its waiting
      // customers) in the middle of an evening demo.
      closingTime: undefined,
    },
  },
  {
    email: "owner2@palo.test",
    name: "Sita Gurung",
    shop: {
      name: "Lakeside Family Clinic",
      category: "clinic",
      city: "Pokhara",
      area: "Lakeside",
      address: "Lakeside Road, Baidam",
      lat: 28.2096,
      lng: 83.9591,
      avgServiceMinutes: 12,
      closingTime: "17:00",
    },
  },
  {
    email: "owner3@palo.test",
    name: "Bikash Tamang",
    shop: {
      name: "Everest Mobile Repair",
      category: "repair_shop",
      city: "Kathmandu",
      area: "New Road",
      address: "Khichapokhari, New Road",
      lat: 27.7041,
      lng: 85.3107,
      avgServiceMinutes: 20,
      closingTime: "19:00",
    },
  },
  {
    email: "owner4@palo.test",
    name: "Anita Thapa",
    shop: {
      name: "Phewa Momo House",
      category: "restaurant",
      city: "Pokhara",
      area: "Damside",
      address: "Pardi Road, Damside",
      lat: 28.2027,
      lng: 83.964,
      avgServiceMinutes: 8,
      closingTime: "21:00",
    },
  },
];

// Names cycled through for the demo customers.
const CUSTOMER_NAMES = [
  "Ram Karki",
  "Gita Adhikari",
  "Sunil Rai",
  "Maya Lama",
  "Prakash Poudel",
  "Sabina Magar",
  "Deepak Bhandari",
  "Nisha Khadka",
  "Rajesh Basnet",
  "Puja Shahi",
  "Kiran Joshi",
  "Asha Neupane",
];

const HISTORY_DAYS = 14;
// The shop "opens" at 10:00 shop-local time, as minutes after midnight.
const OPENING_MINUTES = 10 * 60;
// Customers arrive in small rushes: CUSTOMERS_PER_RUSH people a few minutes
// apart, then a quiet spell. A rush comes faster than the barber's
// 15-minute service, so a line (and a real wait) builds up and then clears,
// and the arrivals spread over several hours of the day.
const CUSTOMERS_PER_RUSH = 4;
const MINUTES_BETWEEN_RUSH_ARRIVALS = 6;
const QUIET_MINUTES_AFTER_RUSH = 60;
// Customers click the email verification link a minute after joining.
const VERIFY_DELAY_MINUTES = 1;
// How long the owner waits for a called customer before marking a no-show.
const NO_SHOW_WAIT_MINUTES = 3;
// How long a customer who leaves the line waited before leaving.
const CANCEL_AFTER_MINUTES = 5;

type DemoTicketStatus = "done" | "no_show" | "cancelled";

// One ticket of a past day. Times are minutes after the shop's midnight.
type PlannedTicket = {
  tokenNumber: number;
  status: DemoTicketStatus;
  joinedAt: number;
  verifiedAt: number;
  calledAt: number | null;
  resolvedAt: number;
};

type SeedSummary = {
  usersCreated: number;
  shopsCreated: number;
  pastDaysCreated: number;
  todaysTicketsCreated: number;
};

export async function seedDemoData(password: string): Promise<void> {
  const summary: SeedSummary = {
    usersCreated: 0,
    shopsCreated: 0,
    pastDaysCreated: 0,
    todaysTicketsCreated: 0,
  };

  const superadmin = await createDemoUser({
    email: SUPERADMIN.email,
    name: SUPERADMIN.name,
    role: "superadmin",
    password,
  });
  if (superadmin.created) summary.usersCreated++;

  for (const [index, demoOwner] of DEMO_OWNERS.entries()) {
    const owner = await createDemoUser({
      email: demoOwner.email,
      name: demoOwner.name,
      role: "owner",
      password,
    });
    if (owner.created) summary.usersCreated++;

    const shop = await createDemoShop(owner.id, demoOwner.shop);
    if (shop.created) summary.shopsCreated++;

    // History and today's queue for the first shop only: one shop with rich
    // data is enough to demo analytics and history.
    if (index === 0) {
      summary.pastDaysCreated = await seedPastQueues(shop.row);
      summary.todaysTicketsCreated = await seedTodaysQueue(shop.row);
    }
  }

  printSummary(summary);
}

// Creates the account through Better Auth's admin API, so the password is
// hashed and the credential account is linked exactly as for a real signup.
// Called server-side with no request headers, Better Auth doesn't ask for an
// admin session (see createUser in better-auth's admin plugin).
async function createDemoUser(input: {
  email: string;
  name: string;
  role: "owner" | "superadmin";
  password: string;
}): Promise<{ id: string; created: boolean }> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing) {
    return { id: existing.id, created: false };
  }

  const { user } = await auth.api.createUser({
    body: {
      email: input.email,
      password: input.password,
      name: input.name,
      role: input.role,
      // Marked verified: nobody can open a verification email sent to .test.
      data: { emailVerified: true },
    },
  });

  return { id: user.id, created: true };
}

// Uses the same service as the onboarding form (slug, one-shop-per-owner
// rule), then reads the full row back because the queue helpers need it.
async function createDemoShop(
  ownerId: string,
  data: CreateShopRequest,
): Promise<{ row: typeof shops.$inferSelect; created: boolean }> {
  const existing = await getOwnerShop(ownerId);
  if (existing) {
    return { row: existing, created: false };
  }

  const result = await createShop(ownerId, data);
  if (!result.success) {
    throw new Error(`Could not create shop "${data.name}": ${result.message}`);
  }

  const row = await getOwnerShop(ownerId);
  if (!row) {
    throw new Error(`Shop "${data.name}" was created but can't be found`);
  }

  return { row, created: true };
}

// Adds a closed queue with tickets for each of the last HISTORY_DAYS days
// (not today). The queue services only ever work on today's queue, so past
// days are inserted directly. Returns how many days were added.
async function seedPastQueues(shop: typeof shops.$inferSelect) {
  const today = getShopLocalDate(shop.timezone);

  const [olderQueues] = await db
    .select({ total: count() })
    .from(queues)
    .where(and(eq(queues.shopId, shop.id), lt(queues.date, today)));

  if ((olderQueues?.total ?? 0) > 0) {
    return 0;
  }

  // One transaction, so a failure halfway leaves no partial history behind
  // (which the check above would then mistake for "already seeded").
  await db.transaction(async (tx) => {
    for (let dayIndex = 0; dayIndex < HISTORY_DAYS; dayIndex++) {
      const date = addDays(today, dayIndex - HISTORY_DAYS);
      const plan = planDayTickets(dayIndex, shop.avgServiceMinutes);

      const [queue] = await tx
        .insert(queues)
        .values({
          shopId: shop.id,
          date,
          status: "closed",
          currentServingNumber: highestCalledToken(plan),
          // Closed by the expiry sweep at the end of the day (midnight). Only
          // the first shop gets history, and it has no closing time.
          expiredAt: shopLocalTimestamp(date, 24 * 60, shop.timezone),
          // Created when the owner first opened the dashboard that morning.
          createdAt: shopLocalTimestamp(
            date,
            OPENING_MINUTES - 10,
            shop.timezone,
          ),
        })
        .returning({ id: queues.id });

      if (!queue) {
        throw new Error(`Could not create the queue for ${date}`);
      }

      await tx.insert(tickets).values(
        plan.map((ticket) => ({
          queueId: queue.id,
          tokenNumber: ticket.tokenNumber,
          customerName: customerName(ticket.tokenNumber + dayIndex),
          // Unique per day and token, so no two demo customers share an email.
          customerEmail: `customer-${date}-${ticket.tokenNumber}@customer.palo.test`,
          status: ticket.status,
          createdAt: shopLocalTimestamp(date, ticket.joinedAt, shop.timezone),
          verifiedAt: shopLocalTimestamp(
            date,
            ticket.verifiedAt,
            shop.timezone,
          ),
          calledAt:
            ticket.calledAt === null
              ? null
              : shopLocalTimestamp(date, ticket.calledAt, shop.timezone),
          resolvedAt: shopLocalTimestamp(
            date,
            ticket.resolvedAt,
            shop.timezone,
          ),
        })),
      );
    }
  });

  return HISTORY_DAYS;
}

// Works out one past day's tickets with a fixed pattern (no randomness), so
// every seed produces the same, explainable data:
// - between 8 and 14 customers, depending on the day, arriving in rushes;
// - the 6th and 12th customers are no-shows and the 7th leaves the line;
// - there is one counter, so a customer is called when they have verified
//   AND the previous customer is finished.
function planDayTickets(
  dayIndex: number,
  avgServiceMinutes: number,
): PlannedTicket[] {
  const ticketCount = 8 + ((dayIndex * 3) % 7);

  const planned: PlannedTicket[] = [];
  let counterFreeAt = OPENING_MINUTES;
  // Some days the first customer comes a little later.
  let joinedAt = OPENING_MINUTES + (dayIndex % 3) * 10;

  for (let i = 0; i < ticketCount; i++) {
    if (i > 0) {
      const rushJustEnded = i % CUSTOMERS_PER_RUSH === 0;
      joinedAt += rushJustEnded
        ? QUIET_MINUTES_AFTER_RUSH
        : MINUTES_BETWEEN_RUSH_ARRIVALS;
    }
    const verifiedAt = joinedAt + VERIFY_DELAY_MINUTES;
    const status = demoTicketStatus(i);

    if (status === "cancelled") {
      // Left while waiting: never called, and the counter isn't used.
      planned.push({
        tokenNumber: i + 1,
        status,
        joinedAt,
        verifiedAt,
        calledAt: null,
        resolvedAt: verifiedAt + CANCEL_AFTER_MINUTES,
      });
      continue;
    }

    const calledAt = Math.max(verifiedAt, counterFreeAt);
    // Service time varies around the shop's average: -4, +0 or +4 minutes.
    const serviceMinutes = avgServiceMinutes + ((i % 3) - 1) * 4;
    const resolvedAt =
      status === "done"
        ? calledAt + serviceMinutes
        : calledAt + NO_SHOW_WAIT_MINUTES;

    planned.push({
      tokenNumber: i + 1,
      status,
      joinedAt,
      verifiedAt,
      calledAt,
      resolvedAt,
    });
    counterFreeAt = resolvedAt;
  }

  return planned;
}

// i is the customer's 0-based place in the day's arrivals.
function demoTicketStatus(i: number): DemoTicketStatus {
  if (i === 6) return "cancelled";
  if (i % 6 === 5) return "no_show";
  return "done";
}

// The queue's counter ends at the last token that was called; a cancelled
// token at the end was never called, so it doesn't count.
function highestCalledToken(plan: PlannedTicket[]): number {
  let highest = 0;
  for (const ticket of plan) {
    if (ticket.calledAt !== null) {
      highest = Math.max(highest, ticket.tokenNumber);
    }
  }
  return highest;
}

function customerName(n: number): string {
  return CUSTOMER_NAMES[n % CUSTOMER_NAMES.length] ?? "Demo Customer";
}

// A shop-local wall-clock time on a given day, as the value the app stores.
// Timestamp columns hold UTC without a zone (analytics reads them with
// `AT TIME ZONE 'UTC'`), so, in SQL:
// 1. date + minutes          -> the wall-clock time in the shop's city;
// 2. AT TIME ZONE <shop tz>  -> read as that city's time: an exact instant;
// 3. AT TIME ZONE 'UTC'      -> that instant as UTC wall-clock time.
// Postgres knows each timezone's offset, so none is hand-coded here.
function shopLocalTimestamp(
  date: string,
  minutesAfterMidnight: number,
  timezone: string,
) {
  return sql`((${date}::date + make_interval(mins => ${minutesAfterMidnight}::int)) AT TIME ZONE ${timezone}) AT TIME ZONE 'UTC'`;
}

// A few customers waiting in today's queue, so the owner's dashboard has
// someone to call. Skipped if today's queue already has tickets (seeded
// earlier, or real customers) or the owner has closed it.
async function seedTodaysQueue(shop: typeof shops.$inferSelect) {
  const queue = await findOrCreateTodaysQueue(shop);

  if (queue.status !== "active") {
    return 0;
  }

  const [existingTickets] = await db
    .select({ total: count() })
    .from(tickets)
    .where(eq(tickets.queueId, queue.id));

  if ((existingTickets?.total ?? 0) > 0) {
    return 0;
  }

  const waitingCount = 4;
  const now = Date.now();
  const minutes = (n: number) => n * 60 * 1000;

  // Tokens start at 1: the queue is empty (checked above), and joinQueue
  // continues from the highest token, so real customers get 5, 6, ...
  // Stored as JS Dates, the same way the ticket services write their times.
  await db.insert(tickets).values(
    Array.from({ length: waitingCount }, (_, i) => {
      // Joined 8 minutes apart, the last one 5 minutes ago.
      const joinedAt = now - minutes(5 + (waitingCount - 1 - i) * 8);
      return {
        queueId: queue.id,
        tokenNumber: i + 1,
        customerName: customerName(i),
        customerEmail: `today-${i + 1}@customer.palo.test`,
        status: "waiting" as const,
        createdAt: new Date(joinedAt),
        verifiedAt: new Date(joinedAt + minutes(VERIFY_DELAY_MINUTES)),
      };
    }),
  );

  return waitingCount;
}

function printSummary(summary: SeedSummary) {
  console.log("Demo data seeded.");
  console.log(`  users created:          ${summary.usersCreated}`);
  console.log(`  shops created:          ${summary.shopsCreated}`);
  console.log(`  past queue days added:  ${summary.pastDaysCreated}`);
  console.log(`  today's tickets added:  ${summary.todaysTicketsCreated}`);
  console.log("");
  console.log("Logins (password: the SEED_PASSWORD you set):");
  console.log(`  ${SUPERADMIN.email}  (superadmin)`);
  for (const owner of DEMO_OWNERS) {
    console.log(`  ${owner.email}  (owner of ${owner.shop.name})`);
  }
}
