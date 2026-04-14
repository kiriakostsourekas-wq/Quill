"use client";

import Link from "next/link";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getHours,
  getMinutes,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  set,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/app/platform-badge";
import { StatusBadge } from "@/components/app/status-badge";

type CalendarView = "month" | "week";

type CalendarPost = {
  id: string;
  postType?: string;
  content: string;
  documentTitle?: string | null;
  platforms: string[];
  status: string;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  voiceScore?: number | null;
  firstComment?: string | null;
};

type CalendarEvent = {
  id: string;
  post: CalendarPost;
  date: Date;
  kind: "scheduled" | "published";
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekHours = Array.from({ length: 18 }, (_, index) => 6 + index);
const hourSlotHeight = 72;

function scoreDotClass(score?: number | null) {
  if (score == null) return "bg-slate-300";
  if (score > 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-400";
  return "bg-red-500";
}

function platformDotClass(platform: string) {
  return platform === "linkedin" ? "bg-[#0A66C2]" : "bg-black";
}

function getDisplayText(post: CalendarPost) {
  if (post.postType === "carousel") {
    return post.documentTitle?.trim() || "Carousel";
  }

  return post.content.trim() || "Untitled post";
}

function truncateLabel(value: string, max = 30) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function getEventDate(post: CalendarPost) {
  if (post.publishedAt) {
    return { date: parseISO(post.publishedAt), kind: "published" as const };
  }

  if (post.scheduledAt) {
    return { date: parseISO(post.scheduledAt), kind: "scheduled" as const };
  }

  return null;
}

function getWeekRange(baseDate: Date) {
  const start = startOfWeek(baseDate, { weekStartsOn: 1 });
  const end = endOfWeek(baseDate, { weekStartsOn: 1 });
  return { start, end };
}

function getMonthRange(baseDate: Date) {
  const start = startOfWeek(startOfMonth(baseDate), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(baseDate), { weekStartsOn: 1 });
  return { start, end };
}

async function readResponseError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function CalendarClient() {
  const router = useRouter();
  const [view, setView] = useState<CalendarView>("month");
  const [cursorDate, setCursorDate] = useState(new Date());
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
  const [loading, setLoading] = useState(true);

  const visibleRange = useMemo(
    () => (view === "month" ? getMonthRange(cursorDate) : getWeekRange(cursorDate)),
    [cursorDate, view]
  );

  const events = useMemo<CalendarEvent[]>(() => {
    return posts
      .map((post) => {
        const eventDate = getEventDate(post);
        if (!eventDate) return null;
        return {
          id: `${post.id}-${eventDate.kind}`,
          post,
          date: eventDate.date,
          kind: eventDate.kind,
        };
      })
      .filter((event): event is CalendarEvent => Boolean(event))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [posts]);

  const monthDays = useMemo(
    () => eachDayOfInterval({ start: visibleRange.start, end: visibleRange.end }),
    [visibleRange]
  );

  const weekDays = useMemo(
    () => eachDayOfInterval(getWeekRange(cursorDate)),
    [cursorDate]
  );

  const hasCurrentMonthPosts = useMemo(() => {
    const monthStart = startOfMonth(cursorDate);
    const monthEnd = endOfMonth(cursorDate);
    return events.some((event) => event.date >= monthStart && event.date <= monthEnd);
  }, [cursorDate, events]);

  const loadPosts = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams({
        from: visibleRange.start.toISOString(),
        to: visibleRange.end.toISOString(),
      });
      const response = await fetch(`/api/posts/calendar?${params.toString()}`);
      if (!response.ok) {
        throw new Error(await readResponseError(response, "Unable to load calendar"));
      }
      const data = await response.json();
      setPosts(data.posts ?? []);
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : "Unable to load calendar");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [visibleRange.end, visibleRange.start]);

  useEffect(() => {
    loadPosts().catch(() => undefined);
  }, [loadPosts]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadPosts({ silent: true });
    }, 60_000);

    return () => clearInterval(interval);
  }, [loadPosts]);

  function goPrevious() {
    setCursorDate((current) =>
      view === "month" ? subMonths(current, 1) : addDays(current, -7)
    );
  }

  function goNext() {
    setCursorDate((current) =>
      view === "month" ? addMonths(current, 1) : addDays(current, 7)
    );
  }

  function goToday() {
    setCursorDate(new Date());
  }

  function openComposeForDate(date: Date) {
    const scheduledAt = set(startOfDay(date), { hours: 9, minutes: 0 });
    router.push(`/compose?scheduledAt=${encodeURIComponent(scheduledAt.toISOString())}`);
  }

  async function deletePost(post: CalendarPost) {
    if (!window.confirm("Delete this post?")) return;

    const response = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error(await readResponseError(response, "Unable to delete post"));
      return;
    }

    setSelectedPost(null);
    await loadPosts({ silent: true });
    toast.success("Post deleted.");
  }

  function renderMonthCell(date: Date) {
    const dayEvents = events.filter((event) => isSameDay(event.date, date));

    return (
      <div
        key={date.toISOString()}
        onClick={() => openComposeForDate(date)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openComposeForDate(date);
          }
        }}
        role="button"
        tabIndex={0}
        className={`relative min-h-[150px] border-b border-r border-line p-3 text-left transition hover:bg-slate-50 ${
          isSameMonth(date, cursorDate) ? "bg-white" : "bg-slate-50/70"
        }`}
      >
        <div
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
            isToday(date) ? "bg-brand text-white" : "text-ink"
          }`}
        >
          {format(date, "d")}
        </div>

        <div className="mt-3 space-y-2">
          {dayEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                setSelectedPost(event.post);
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-line bg-slate-50 px-2 py-2 text-left text-xs text-ink transition hover:border-brand/30 hover:bg-white"
            >
              <span className={`h-2 w-2 rounded-full ${scoreDotClass(event.post.voiceScore)}`} />
              <span className="min-w-0 flex-1 truncate">{truncateLabel(getDisplayText(event.post))}</span>
              {event.kind === "published" && (
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-emerald-600">
                  Published
                </span>
              )}
              <div className="flex items-center gap-1">
                {event.post.platforms.map((platform) => (
                  <span
                    key={`${event.id}-${platform}`}
                    className={`h-2 w-2 rounded-full ${platformDotClass(platform)}`}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderWeekEvent(event: CalendarEvent, index: number) {
    const hour = getHours(event.date);
    const minute = getMinutes(event.date);
    const totalMinutes = Math.max(0, (hour - 6) * 60 + minute);
    const top = (totalMinutes / 60) * hourSlotHeight;

    return (
      <button
        key={event.id}
        type="button"
        onClick={() => setSelectedPost(event.post)}
        className="absolute left-2 right-2 rounded-xl border border-line bg-white px-3 py-2 text-left shadow-soft"
        style={{
          top: `${top + index * 6}px`,
          minHeight: "62px",
        }}
      >
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${scoreDotClass(event.post.voiceScore)}`} />
          <span className="truncate text-sm font-medium text-ink">
            {truncateLabel(getDisplayText(event.post), 40)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
          <span>{event.kind === "published" ? "Published" : format(event.date, "p")}</span>
          <div className="flex items-center gap-1">
            {event.post.platforms.map((platform) => (
              <span
                key={`${event.id}-${platform}`}
                className={`h-2 w-2 rounded-full ${platformDotClass(platform)}`}
              />
            ))}
          </div>
        </div>
      </button>
    );
  }

  const heading =
    view === "month"
      ? format(cursorDate, "MMMM yyyy")
      : `${format(weekDays[0], "MMMM d")} – ${format(weekDays[weekDays.length - 1], "MMMM d, yyyy")}`;

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={goPrevious}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button variant="outline" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" className="gap-2" onClick={goNext}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h1 className="text-center text-2xl font-semibold text-ink">{heading}</h1>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <div className="flex rounded-full border border-line bg-white p-1">
            <button
              type="button"
              onClick={() => setView("week")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                view === "week" ? "bg-brand text-white" : "text-muted"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setView("month")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                view === "month" ? "bg-brand text-white" : "text-muted"
              }`}
            >
              Month
            </button>
          </div>
          <Link href="/compose">
            <Button>Compose new post →</Button>
          </Link>
        </div>
      </div>

      <div className="quill-card relative overflow-hidden">
        {loading ? (
          <div className="flex min-h-[720px] items-center justify-center text-sm text-muted">
            Loading calendar...
          </div>
        ) : view === "month" ? (
          <div className="relative">
            <div className="grid grid-cols-7 border-b border-line bg-slate-50">
              {weekdayLabels.map((label) => (
                <div
                  key={label}
                  className="border-r border-line px-3 py-3 text-sm font-medium text-muted last:border-r-0"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthDays.map((day, index) => (
                <div key={day.toISOString()} className={index % 7 === 6 ? "border-r-0" : ""}>
                  {renderMonthCell(day)}
                </div>
              ))}
            </div>

            {!hasCurrentMonthPosts && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-xl border border-line bg-white/95 px-6 py-4 text-sm text-muted shadow-soft">
                  Nothing scheduled yet. Click any day to start writing.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[980px] grid-cols-[80px_repeat(7,minmax(0,1fr))]">
              <div className="border-b border-r border-line bg-slate-50" />
              {weekDays.map((day) => (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => openComposeForDate(day)}
                  className="border-b border-r border-line bg-slate-50 px-3 py-3 text-left hover:bg-white"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-muted">{format(day, "EEE")}</p>
                  <p className={`mt-1 text-sm font-semibold ${isToday(day) ? "text-brand" : "text-ink"}`}>
                    {format(day, "d MMM")}
                  </p>
                </button>
              ))}

              <div className="relative border-r border-line">
                {weekHours.map((hour) => (
                  <div
                    key={hour}
                    className="flex h-[72px] items-start justify-end border-b border-line pr-3 pt-2 text-xs text-muted"
                  >
                    {format(set(new Date(), { hours: hour, minutes: 0 }), "ha")}
                  </div>
                ))}
              </div>

              {weekDays.map((day) => {
                const dayEvents = events.filter((event) => isSameDay(event.date, day));

                return (
                  <div
                    key={`week-${day.toISOString()}`}
                    className="relative border-r border-line"
                    style={{ height: `${weekHours.length * hourSlotHeight}px` }}
                  >
                    {weekHours.map((hour) => (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className="h-[72px] border-b border-line"
                      />
                    ))}

                    {dayEvents.map((event, index) => renderWeekEvent(event, index))}
                  </div>
                );
              })}
            </div>

            {events.length === 0 && (
              <div className="flex items-center justify-center px-6 py-12 text-sm text-muted">
                Nothing scheduled yet. Click any day to start writing.
              </div>
            )}
          </div>
        )}
      </div>

      {selectedPost && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setSelectedPost(null)}
            aria-label="Close calendar post details"
          />
          <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-line bg-white px-6 py-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted">
                  {selectedPost.publishedAt ? "Published" : "Scheduled"} post
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink">
                  {selectedPost.postType === "carousel"
                    ? selectedPost.documentTitle || "Carousel"
                    : "Post details"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="rounded-full border border-line p-2 text-muted hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {selectedPost.platforms.map((platform) => (
                <PlatformBadge key={`${selectedPost.id}-${platform}`} platform={platform} />
              ))}
              <StatusBadge value={selectedPost.status} />
              <span
                className={`inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700`}
              >
                <span className={`h-2 w-2 rounded-full ${scoreDotClass(selectedPost.voiceScore)}`} />
                Voice score {selectedPost.voiceScore ?? "—"}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-line p-4">
                <p className="text-sm text-muted">Scheduled time</p>
                <p className="mt-1 font-medium text-ink">
                  {selectedPost.scheduledAt
                    ? format(parseISO(selectedPost.scheduledAt), "EEEE, MMMM d 'at' p")
                    : "Not scheduled"}
                </p>
              </div>

              {selectedPost.publishedAt && (
                <div className="rounded-xl border border-line p-4">
                  <p className="text-sm text-muted">Published time</p>
                  <p className="mt-1 font-medium text-ink">
                    {format(parseISO(selectedPost.publishedAt), "EEEE, MMMM d 'at' p")}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-line p-4">
                <p className="text-sm text-muted">Content</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">
                  {selectedPost.postType === "carousel"
                    ? selectedPost.documentTitle || "Carousel"
                    : selectedPost.content}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`${selectedPost.postType === "carousel" ? "/carousel" : "/compose"}?postId=${selectedPost.id}`}>
                <Button variant="outline" className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Button
                variant="danger"
                className="gap-2"
                onClick={() => {
                  void deletePost(selectedPost);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
