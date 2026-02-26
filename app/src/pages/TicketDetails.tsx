import React, { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useCurrentUser } from "../hooks/useAuth";
import {
  useAddComment,
  useDeleteComment,
  useTicketActivity,
  useTicketComments,
  useTicketDetails,
  useUpdateComment,
} from "../hooks/useTickets";
import "../styles/TicketWorkflow.css";

interface Comment {
  id: string;
  body?: string;
  content?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  created_at?: string;
  updated_at?: string;
  authorId?: string;
  author?: {
    id?: string;
    displayName?: string;
    email?: string;
    role?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
}

interface Activity {
  id: string;
  type: string;
  actor_name?: string;
  actor_email?: string;
  metadata?: any;
  created_at?: string;
  actorName?: string;
  actorEmail?: string;
  createdAt?: string;
}

type CurrentUser = {
  id?: string | number;
  role?: string;
  roles?: Array<{ name?: string }>;
};

type ActivityTone = "neutral" | "warning" | "success" | "info" | "danger";

const hasAdminRole = (user: CurrentUser | null | undefined) => {
  if (!user) {
    return false;
  }

  return (
    user.role === "admin" ||
    user.role === "super_admin" ||
    Boolean(
      user.roles?.some(
        (role) => role.name === "admin" || role.name === "super_admin",
      ),
    )
  );
};

const toDisplaySupportCategory = (supportCategory?: string | null) => {
  if (!supportCategory || supportCategory === "Unassigned") {
    return "Unassigned";
  }

  return supportCategory
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return "Unknown time";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown time";
  }
  return parsed.toLocaleString();
};

const getActivityConfig = (
  type: string,
): { label: string; code: string; tone: ActivityTone } => {
  const configs: Record<string, { label: string; code: string; tone: ActivityTone }> = {
    creation: { label: "Created", code: "CR", tone: "info" },
    status_change: { label: "Status Changed", code: "ST", tone: "warning" },
    scope_assignment: { label: "Scope Assigned", code: "SC", tone: "success" },
    comment_added: { label: "Comment Added", code: "CM", tone: "info" },
    comment_updated: { label: "Comment Updated", code: "UP", tone: "neutral" },
    comment_deleted: { label: "Comment Deleted", code: "DL", tone: "danger" },
    ticket_updated: { label: "Ticket Updated", code: "UP", tone: "neutral" },
    ticket_deleted: { label: "Ticket Deleted", code: "DL", tone: "danger" },
  };

  return configs[type] || { label: "Unknown Event", code: "UK", tone: "neutral" };
};

const ActivityItem: React.FC<{
  activity: Activity;
  isOwnComment?: boolean;
}> = ({ activity, isOwnComment }) => {
  const config = getActivityConfig(activity.type);
  const isCommentActivity = ["comment_added", "comment_updated", "comment_deleted"].includes(
    activity.type,
  );
  const actorName =
    activity.actor_name ??
    activity.actorName ??
    activity.actor_email ??
    activity.actorEmail ??
    "Someone";
  const createdAt = activity.created_at ?? activity.createdAt;

  return (
    <article
      className={
        isCommentActivity && isOwnComment
          ? "ticket-details-activity-item ticket-details-activity-item-owned"
          : "ticket-details-activity-item"
      }
    >
      <span
        className={`ticket-details-activity-badge ticket-details-activity-badge-${config.tone}`}
        aria-hidden="true"
      >
        {config.code}
      </span>

      <div className="ticket-details-activity-main">
        <div className="ticket-details-activity-top">
          <span className="ticket-details-activity-label">{config.label}</span>
          <time className="ticket-details-activity-time">{formatDateTime(createdAt)}</time>
        </div>

        <p className="ticket-details-activity-copy">
          <strong>{actorName}</strong>{" "}
          {activity.type === "status_change" ? (
            <>
              changed status from{" "}
              <strong>{activity.metadata?.old_status || "Unknown"}</strong> to{" "}
              <strong>{activity.metadata?.new_status || "Unknown"}</strong>
            </>
          ) : null}
          {activity.type === "scope_assignment" ? (
            <>
              assigned to{" "}
              <strong>
                {activity.metadata?.scope_label ||
                  activity.metadata?.support_category ||
                  "Unknown Scope"}
              </strong>
            </>
          ) : null}
          {activity.type === "comment_added" ? (
            <>added a comment: "{activity.metadata?.body_preview || ""}"</>
          ) : null}
          {activity.type === "comment_updated" ? <>updated a comment</> : null}
          {activity.type === "comment_deleted" ? <>deleted a comment</> : null}
        </p>
      </div>
    </article>
  );
};

const CommentSection: React.FC<{
  ticketId: string;
  comments: Comment[];
  pagination: any;
  onLoadMore: () => void;
  currentUser: CurrentUser | null;
}> = ({ ticketId, comments, pagination, onLoadMore, currentUser }) => {
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const { addComment, isAdding } = useAddComment();
  const { updateComment, isUpdating } = useUpdateComment();
  const { deleteComment, isDeleting } = useDeleteComment();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newComment.trim()) {
      return;
    }

    try {
      await addComment({ ticketId, body: newComment.trim() });
      setNewComment("");
    } catch {
      // Error handling is managed in hook-level notifications.
    }
  };

  const handleEdit = (commentId: string, body: string) => {
    setEditingComment(String(commentId));
    setEditBody(body);
  };

  const handleUpdate = async (commentId: string) => {
    if (!editBody.trim()) {
      return;
    }

    try {
      await updateComment({ ticketId, commentId, body: editBody.trim() });
      setEditingComment(null);
      setEditBody("");
    } catch {
      // Error handling is managed in hook-level notifications.
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment({ ticketId, commentId });
    } catch {
      // Error handling is managed in hook-level notifications.
    }
  };

  return (
    <section className="ticket-details-card">
      <header className="ticket-details-section-header">
        <h2>Comments ({pagination.total})</h2>
      </header>

      <form onSubmit={handleSubmit} className="ticket-details-comment-form">
        <label htmlFor="new-comment" className="ticket-details-label">
          Add a Comment
        </label>
        <textarea
          id="new-comment"
          value={newComment}
          onChange={(event) => setNewComment(event.target.value)}
          placeholder="Share your update for this ticket..."
          rows={4}
          disabled={isAdding}
          className="ticket-details-input ticket-details-textarea"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || isAdding}
          className="ticket-details-primary-btn"
        >
          {isAdding ? "Adding..." : "Add Comment"}
        </button>
      </form>

      <div className="ticket-details-comments-wrap">
        {comments.length === 0 ? (
          <p className="ticket-details-empty-state">
            No comments yet. Add context to help the team resolve this faster.
          </p>
        ) : (
          <div className="ticket-details-comment-list">
            {comments.map((comment) => {
              const commentId = String(comment.id);
              const commentBody = comment.body ?? comment.content ?? "";
              const authorId =
                comment.user_id ??
                comment.userId ??
                comment.authorId ??
                comment.author?.id ??
                "";
              const authorName =
                comment.user_name ??
                comment.userName ??
                comment.author?.displayName ??
                "Unknown User";
              const authorRole =
                comment.user_role ?? comment.userRole ?? comment.author?.role ?? "user";
              const createdAt = comment.created_at ?? comment.createdAt;
              const updatedAt = comment.updated_at ?? comment.updatedAt ?? createdAt;
              const isOwner =
                Boolean(authorId) &&
                Boolean(currentUser?.id) &&
                String(authorId) === String(currentUser?.id);
              const isUpdated =
                Boolean(createdAt) &&
                Boolean(updatedAt) &&
                new Date(updatedAt).getTime() !== new Date(createdAt).getTime();

              return (
                <article key={commentId} className="ticket-details-comment-item">
                  <header className="ticket-details-comment-top">
                    <div>
                      <p className="ticket-details-comment-author">{authorName}</p>
                      <p className="ticket-details-comment-role">{authorRole}</p>
                    </div>

                    {isOwner || hasAdminRole(currentUser) ? (
                      <div className="ticket-details-comment-actions">
                        {editingComment === commentId ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdate(commentId)}
                              disabled={isUpdating}
                              className="ticket-details-action-btn ticket-details-action-btn-save"
                            >
                              {isUpdating ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingComment(null);
                                setEditBody("");
                              }}
                              className="ticket-details-action-btn ticket-details-action-btn-cancel"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEdit(commentId, commentBody)}
                              disabled={isUpdating || isDeleting}
                              className="ticket-details-action-btn ticket-details-action-btn-edit"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(commentId)}
                              disabled={isUpdating || isDeleting}
                              className="ticket-details-action-btn ticket-details-action-btn-delete"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </header>

                  {editingComment === commentId ? (
                    <textarea
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      rows={4}
                      autoFocus
                      className="ticket-details-input ticket-details-textarea"
                    />
                  ) : (
                    <p className="ticket-details-comment-body">{commentBody}</p>
                  )}

                  <p className="ticket-details-comment-time">
                    {isUpdated
                      ? `Updated ${formatDateTime(updatedAt)}`
                      : formatDateTime(createdAt)}
                  </p>
                </article>
              );
            })}
          </div>
        )}

        {pagination.hasNext ? (
          <div className="ticket-details-load-more">
            <button
              type="button"
              onClick={onLoadMore}
              className="ticket-details-primary-btn"
            >
              Load More Comments
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useCurrentUser();
  const currentCommentsPage = Number(searchParams.get("commentsPage") ?? "1");
  const commentsPage =
    Number.isFinite(currentCommentsPage) && currentCommentsPage > 0
      ? Math.floor(currentCommentsPage)
      : 1;

  const { data: ticketData, isLoading, error } = useTicketDetails(id);
  const { data: commentsData } = useTicketComments(id, commentsPage);
  const { data: activityData } = useTicketActivity(id);

  const ticket = (ticketData as any)?.ticket ?? ticketData;
  const comments = (commentsData as any)?.comments || (Array.isArray(commentsData) ? commentsData : []);
  const commentsPagination =
    (commentsData as any)?.pagination ||
    (commentsData as any)?.commentsPagination || { total: comments.length, hasNext: false, page: commentsPage };
  const activityFromEndpoint = Array.isArray(activityData)
    ? activityData
    : (activityData as any)?.activity;
  const activity = activityFromEndpoint ?? (ticketData as any)?.activity ?? [];

  if (isLoading) {
    return (
      <section className="ticket-flow-feedback ticket-flow-feedback-loading">
        <p>Loading ticket details...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="ticket-flow-feedback ticket-flow-feedback-error">
        <p>Error loading ticket details: {error.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ticket-details-primary-btn"
        >
          Retry
        </button>
      </section>
    );
  }

  if (!ticket) {
    return (
      <section className="ticket-flow-feedback ticket-flow-feedback-loading">
        <p>Ticket not found.</p>
      </section>
    );
  }

  const handleLoadMoreComments = () => {
    const paginationPage = Number(commentsPagination.page);
    const safeCurrentPage =
      Number.isFinite(paginationPage) && paginationPage > 0
        ? Math.floor(paginationPage)
        : commentsPage;
    const nextPage = safeCurrentPage + 1;
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("commentsPage", String(nextPage));
    setSearchParams(nextSearchParams, { replace: false });
  };

  const title = (ticket as any).title || (ticket as any).name || "Untitled ticket";
  const status = (ticket.status || "open").toString().toUpperCase();
  const priority = (ticket.priority || "medium").toString().toUpperCase();
  const scopeRaw =
    (ticket as any).supportCategory || (ticket as any).support_category || "Unassigned";
  const scopeLabel = toDisplaySupportCategory(scopeRaw);
  const createdAt = (ticket as any).createdAt || (ticket as any).created_at;
  const updatedAt = (ticket as any).updatedAt || (ticket as any).updated_at;

  const statusToneClass =
    status === "OPEN"
      ? "ticket-details-badge ticket-details-badge-warning"
      : "ticket-details-badge ticket-details-badge-success";
  const priorityToneClass =
    priority === "HIGH"
      ? "ticket-details-badge ticket-details-badge-danger"
      : priority === "LOW"
        ? "ticket-details-badge ticket-details-badge-neutral"
        : "ticket-details-badge ticket-details-badge-info";

  return (
    <section className="ticket-details-page">
      <div className="ticket-details-nav-row">
        <Link to="/app/support#simple" className="ticket-details-back-link">
          Back to Support
        </Link>
      </div>

      <header className="ticket-details-hero">
        <p className="ticket-details-eyebrow">Ticket Detail</p>
        <h1>{title}</h1>
        <p>
          Review priority, status, timeline updates, and comments from one
          workspace.
        </p>

        <div className="ticket-details-grid">
          <div className="ticket-details-stat">
            <span className="ticket-details-stat-label">Priority</span>
            <span className={priorityToneClass}>{priority}</span>
          </div>

          <div className="ticket-details-stat">
            <span className="ticket-details-stat-label">Status</span>
            <span className={statusToneClass}>{status}</span>
          </div>

          <div className="ticket-details-stat">
            <span className="ticket-details-stat-label">Support Category</span>
            <span className="ticket-details-stat-value">{scopeLabel}</span>
            {scopeRaw !== "Unassigned" ? (
              <span className="ticket-details-stat-meta">{scopeRaw}</span>
            ) : null}
          </div>

          <div className="ticket-details-stat">
            <span className="ticket-details-stat-label">Created</span>
            <span className="ticket-details-stat-value">{formatDateTime(createdAt)}</span>
          </div>

          <div className="ticket-details-stat">
            <span className="ticket-details-stat-label">Last Updated</span>
            <span className="ticket-details-stat-value">{formatDateTime(updatedAt)}</span>
          </div>
        </div>
      </header>

      <section className="ticket-details-card">
        <header className="ticket-details-section-header">
          <h2>Activity Timeline</h2>
        </header>

        {activity.length === 0 ? (
          <p className="ticket-details-empty-state">
            No activity has been recorded yet for this ticket.
          </p>
        ) : (
          <div className="ticket-details-activity-list">
            {activity.map((activityItem) => (
              <ActivityItem
                key={activityItem.id}
                activity={activityItem}
                isOwnComment={
                  activityItem.type === "comment_updated" &&
                  Boolean(activityItem.metadata?.comment_id)
                }
              />
            ))}
          </div>
        )}
      </section>

      <CommentSection
        ticketId={id}
        comments={comments}
        pagination={commentsPagination}
        onLoadMore={handleLoadMoreComments}
        currentUser={currentUser}
      />
    </section>
  );
}
