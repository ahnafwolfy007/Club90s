"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch, ClientApiError } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/auth/current-user-context";

type Comment = { id: string; content: string; author: { fullName: string } };
type Post = {
  id: string;
  content: string;
  createdAt: string;
  sectorTag: string | null;
  author: { id: string; fullName: string };
  reactions: { memberId: string; reactionType: string }[];
  comments: Comment[];
};

export function Feed({ canModerate }: { canModerate: boolean }) {
  const user = useCurrentUser();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  function load() {
    apiFetch<{ posts: Post[] }>("/api/v1/feed/posts").then((data) => setPosts(data.posts));
  }
  useEffect(load, []);

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      await apiFetch("/api/v1/feed/posts", { method: "POST", body: JSON.stringify({ content }) });
      setContent("");
      load();
    } catch {
      // surfaced inline via disabled state; keep simple for feed posting
    } finally {
      setPosting(false);
    }
  }

  async function react(postId: string) {
    await apiFetch(`/api/v1/feed/posts/${postId}/reactions`, { method: "POST", body: JSON.stringify({ reactionType: "like" }) });
    load();
  }

  async function comment(postId: string) {
    const text = commentDrafts[postId];
    if (!text?.trim()) return;
    await apiFetch(`/api/v1/feed/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ content: text }) });
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    load();
  }

  async function remove(postId: string) {
    const reason = canModerate ? prompt("Reason for removing this post:") : undefined;
    if (canModerate && !reason) return;
    try {
      await apiFetch(`/api/v1/feed/posts/${postId}`, { method: "DELETE", body: reason ? JSON.stringify({ reason }) : undefined });
      load();
    } catch (err) {
      alert(err instanceof ClientApiError ? err.message : "Something went wrong.");
    }
  }

  if (!posts) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submitPost} className="flex flex-col gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share something with the club…"
          rows={2}
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-base"
        />
        <Button type="submit" disabled={posting || !content.trim()} className="self-end">
          Post
        </Button>
      </form>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No posts yet — be the first.</p>
      ) : (
        posts.map((p) => {
          const liked = p.reactions.some((r) => r.memberId === user.memberId);
          const canRemove = canModerate || p.author.id === user.memberId;
          return (
            <Card key={p.id}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {p.author.fullName}
                  {p.sectorTag && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-primary">{p.sectorTag}</span>}
                </p>
                {canRemove && (
                  <button onClick={() => remove(p.id)} className="text-xs text-danger">
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{p.content}</p>
              <div className="mt-2 flex items-center gap-3">
                <button onClick={() => react(p.id)} className={`text-sm ${liked ? "text-primary" : "text-muted-foreground"}`}>
                  👍 {p.reactions.length}
                </button>
              </div>
              <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2">
                {p.comments.map((c) => (
                  <p key={c.id} className="text-sm">
                    <span className="font-medium">{c.author.fullName}:</span> {c.content}
                  </p>
                ))}
                <div className="mt-1 flex gap-2">
                  <input
                    value={commentDrafts[p.id] ?? ""}
                    onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder="Add a comment…"
                    className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
                  />
                  <button onClick={() => comment(p.id)} className="text-sm font-medium text-primary">
                    Send
                  </button>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
