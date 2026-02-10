// client/src/pages/TicketDetails.tsx
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  useTicketDetails, 
  useTicketComments, 
  useTicketActivity,
  useAddComment,
  useUpdateComment,
  useDeleteComment,
} from '../hooks/useTickets';

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

// Activity type icons and colors
const getActivityConfig = (type: string) => {
  const configs = {
    creation: { icon: '🎫', color: '#007bff', label: 'Created' },
    status_change: { icon: '🔄', color: '#ffc107', label: 'Status Changed' },
    hotel_assignment: { icon: '🏨', color: '#28a745', label: 'Hotel Assigned' },
    comment_added: { icon: '💬', color: '#17a2b8', label: 'Comment Added' },
    comment_updated: { icon: '✏️', color: '#6c757d', label: 'Comment Updated' },
    comment_deleted: { icon: '🗑️', color: '#dc3545', label: 'Comment Deleted' },
    ticket_updated: { icon: '📝', color: '#6610f2', label: 'Updated' },
    ticket_deleted: { icon: '🗑️', color: '#dc3545', label: 'Deleted' },
  };
  
  return configs[type] || { icon: '❓', color: '#6c757d', label: 'Unknown' };
};

const ActivityItem: React.FC<{ activity: Activity; isOwnComment?: boolean }> = ({ activity, isOwnComment }) => {
  const config = getActivityConfig(activity.type);
  const isCommentActivity = ['comment_added', 'comment_updated', 'comment_deleted'].includes(activity.type);
  const actorName = activity.actor_name ?? activity.actorName ?? activity.actor_email ?? activity.actorEmail ?? 'Someone';
  const createdAt = activity.created_at ?? activity.createdAt;
  
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      padding: '1rem',
      backgroundColor: isCommentActivity && isOwnComment ? '#f8f9fa' : 'white',
      borderRadius: '8px',
      border: `1px solid ${isCommentActivity && isOwnComment ? '#e9ecef' : '#f1f3f4'}`,
      alignItems: 'flex-start',
    }}>
      <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>
        {config.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem'
        }}>
          <span style={{
            fontWeight: '600',
            color: config.color,
            fontSize: '0.875rem'
          }}>
            {config.label}
          </span>
          <span style={{ 
            fontSize: '0.75rem', 
            color: '#6c757d',
            whiteSpace: 'nowrap'
          }}>
            {createdAt ? new Date(createdAt).toLocaleString() : 'Unknown time'}
          </span>
        </div>
        
        <div style={{ 
          fontSize: '0.9rem', 
          color: '#495057',
          lineHeight: '1.4'
        }}>
          {actorName && <strong>{actorName}</strong>}{' '}
          {activity.type === 'status_change' && (
            <>
              changed status from <strong>{activity.metadata?.old_status || 'Unknown'}</strong> to{' '}
              <strong>{activity.metadata?.new_status || 'Unknown'}</strong>
            </>
          )}
          {activity.type === 'hotel_assignment' && (
            <>
              assigned to <strong>{activity.metadata?.hotel_name || 'Unknown Hotel'}</strong>
            </>
          )}
          {activity.type === 'comment_added' && (
            <>added a comment: "{activity.metadata?.body_preview || ''}"</>
          )}
          {activity.type === 'comment_updated' && (
            <>updated a comment</>
          )}
          {activity.type === 'comment_deleted' && (
            <>deleted a comment</>
          )}
        </div>
      </div>
    </div>
  );
};

const CommentSection: React.FC<{ 
  ticketId: string; 
  comments: Comment[]; 
  pagination: any;
  onLoadMore: () => void;
}> = ({ ticketId, comments, pagination, onLoadMore }) => {
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const { addComment, isAdding } = useAddComment();
  const { updateComment, isUpdating } = useUpdateComment();
  const { deleteComment, isDeleting } = useDeleteComment();
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    try {
      await addComment({ ticketId, body: newComment.trim() });
      setNewComment('');
    } catch {
      // Error is handled by the hook
    }
  };

  const handleEdit = (commentId: string, body: string) => {
    setEditingComment(String(commentId));
    setEditBody(body);
  };

  const handleUpdate = async (commentId: string) => {
    if (!editBody.trim()) return;
    
    try {
      await updateComment({ ticketId, commentId, body: editBody.trim() });
      setEditingComment(null);
      setEditBody('');
    } catch {
      // Error is handled by the hook
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment({ ticketId, commentId });
    } catch {
      // Error is handled by the hook
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: '1px solid #e9ecef',
      marginTop: '1.5rem'
    }}>
      <h3 style={{ 
        padding: '1rem 1.5rem', 
        margin: 0, 
        fontSize: '1.125rem',
        fontWeight: '600',
        borderBottom: '1px solid #e9ecef',
        color: '#495057'
      }}>
        💬 Comments ({pagination.total})
      </h3>
      
      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} style={{ 
        padding: '1rem 1.5rem', 
        borderBottom: '1px solid #e9ecef',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: '500',
            color: '#495057'
          }}>
            Add a Comment
          </label>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts about this ticket..."
            rows={3}
            disabled={isAdding}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              resize: 'vertical',
              fontFamily: 'inherit',
              backgroundColor: isAdding ? '#f8f9fa' : 'white'
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!newComment.trim() || isAdding}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: !newComment.trim() || isAdding ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !newComment.trim() || isAdding ? 'not-allowed' : 'pointer',
            fontWeight: '500'
          }}
        >
          {isAdding ? 'Adding...' : 'Add Comment'}
        </button>
      </form>

      {/* Comments List */}
      <div style={{ padding: '1rem' }}>
        {comments.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6c757d',
            fontSize: '0.9rem'
          }}>
            No comments yet. Be the first to share your thoughts!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {comments.map((comment) => {
              const commentId = String(comment.id);
              const commentBody = comment.body ?? comment.content ?? '';
              const authorId =
                comment.user_id ?? comment.userId ?? comment.authorId ?? comment.author?.id ?? '';
              const authorName =
                comment.user_name ??
                comment.userName ??
                comment.author?.displayName ??
                'Unknown User';
              const authorRole = comment.user_role ?? comment.userRole ?? comment.author?.role ?? 'user';
              const createdAt = comment.created_at ?? comment.createdAt;
              const updatedAt = comment.updated_at ?? comment.updatedAt ?? createdAt;
              const isOwner =
                authorId && currentUser?.id && String(authorId) === String(currentUser.id);
              const isUpdated =
                createdAt &&
                updatedAt &&
                new Date(updatedAt).getTime() !== new Date(createdAt).getTime();

              return (
                <div
                  key={commentId}
                  style={{
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef',
                    position: 'relative'
                  }}
                >
                  {/* Comment Actions */}
                  {(isOwner || currentUser.role === 'admin') && (
                    <div style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      display: 'flex',
                      gap: '0.5rem'
                    }}>
                      {editingComment === commentId ? (
                        <>
                          <button
                            onClick={() => handleUpdate(commentId)}
                            disabled={isUpdating}
                            style={{
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.8rem',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isUpdating ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {isUpdating ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingComment(null);
                              setEditBody('');
                            }}
                            style={{
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.8rem',
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(commentId, commentBody)}
                            disabled={isUpdating || isDeleting}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              backgroundColor: '#ffc107',
                              color: 'black',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isUpdating || isDeleting ? 'not-allowed' : 'pointer'
                            }}
                          >Edit</button>
                          <button
                            onClick={() => handleDelete(commentId)}
                            disabled={isUpdating || isDeleting}
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isUpdating || isDeleting ? 'not-allowed' : 'pointer'
                            }}
                          >{isDeleting ? 'Deleting...' : 'Delete'}</button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Comment Content */}
                  <div style={{ marginRight: editingComment === commentId ? '0' : '3rem' }}>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6c757d',
                      marginBottom: '0.5rem',
                      fontWeight: '500'
                    }}>
                      {authorName}
                      <span style={{
                        marginLeft: '0.5rem',
                        fontWeight: 'normal',
                        color: '#007bff',
                        fontSize: '0.8rem'
                      }}>
                        ({authorRole})
                      </span>
                    </div>

                    {editingComment === commentId ? (
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={4}
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          fontSize: '1rem',
                          border: '1px solid #007bff',
                          borderRadius: '4px',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: '1rem',
                        color: '#495057',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {commentBody}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6c757d',
                    marginTop: '0.5rem',
                    textAlign: 'right'
                  }}>
                    {isUpdated ? (
                      <span>Updated {new Date(updatedAt).toLocaleString()}</span>
                    ) : (
                      <span>{createdAt ? new Date(createdAt).toLocaleString() : 'Unknown time'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {pagination.hasNext && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              onClick={onLoadMore}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.9rem'
              }}
            >
              Load More Comments
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: ticketData, isLoading, error } = useTicketDetails(id);
  const { data: commentsData } = useTicketComments(id);
  const { data: activityData } = useTicketActivity(id);

  const ticket = (ticketData as any)?.ticket ?? ticketData;
  const comments = (commentsData as any)?.comments
    || (Array.isArray(commentsData) ? commentsData : []);
  const commentsPagination =
    (commentsData as any)?.pagination
    || (commentsData as any)?.commentsPagination
    || { total: comments.length, hasNext: false, page: 1 };
  const activityFromEndpoint = Array.isArray(activityData)
    ? activityData
    : (activityData as any)?.activity;
  const activity = activityFromEndpoint ?? (ticketData as any)?.activity ?? [];
  
  if (isLoading) {
    return (
      <div style={{ 
        padding: '2rem', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div>Loading ticket details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '2rem', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div style={{ 
          color: '#dc3545', 
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          Error loading ticket details: {error.message}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ 
        padding: '2rem', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div>Ticket not found</div>
      </div>
    );
  }

  const handleLoadMoreComments = () => {
    const nextPage = commentsPagination.page + 1;
    navigate(`?commentsPage=${nextPage}`, { replace: false });
  };
  const title = (ticket as any).title || (ticket as any).name || 'Untitled ticket';
  const status = (ticket.status || 'open').toString().toUpperCase();
  const priority = (ticket.priority || 'medium').toString().toUpperCase();
  const hotelLabel = (ticket as any).hotelName || (ticket as any).hotel_name || (ticket as any).hotelId || 'Unassigned';
  const createdAt = (ticket as any).createdAt || (ticket as any).created_at;
  const updatedAt = (ticket as any).updatedAt || (ticket as any).updated_at;

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Back Button */}
        <div style={{ marginBottom: '2rem' }}>
          <Link
            to="/tickets"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#6c757d',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
          >
            ← Back to Tickets
          </Link>
        </div>

        {/* Ticket Details Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e9ecef',
          padding: '2rem',
          marginBottom: '1.5rem'
        }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#212529', 
            margin: '0 0 0.5rem 0' 
          }}>
            <span aria-hidden="true" style={{ marginRight: '0.5rem' }}>🎫</span>
            <span>{title}</span>
          </h1>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div>
              <h3 style={{ color: '#6c757d', marginBottom: '0.5rem' }}>Priority</h3>
              <p style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: '#495057' 
              }}>
                {priority}
              </p>
            </div>
            
            <div>
              <h3 style={{ color: '#6c757d', marginBottom: '0.5rem' }}>Status</h3>
              <span style={{
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '500',
                backgroundColor: status === 'OPEN' ? '#fff3cd' : '#d4edda',
                color: status === 'OPEN' ? '#856404' : '#155724'
              }}>
                {status}
              </span>
            </div>
            
            <div>
              <h3 style={{ color: '#6c757d', marginBottom: '0.5rem' }}>Hotel</h3>
              <p style={{ 
                fontSize: '1rem', 
                color: '#495057' 
              }}>
                {hotelLabel || <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Unassigned</span>}
              </p>
            </div>
            
            <div>
              <h3 style={{ color: '#6c757d', marginBottom: '0.5rem' }}>Created</h3>
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#6c757d' 
              }}>
                {createdAt ? new Date(createdAt).toLocaleString() : 'Unknown'}
              </p>
            </div>
            
            <div>
              <h3 style={{ color: '#6c757d', marginBottom: '0.5rem' }}>Last Updated</h3>
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#6c757d' 
              }}>
                {updatedAt ? new Date(updatedAt).toLocaleString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e9ecef',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ 
            padding: '0 1.5rem', 
            margin: '0 0 1rem 0', 
            fontSize: '1.125rem',
            fontWeight: '600',
            borderBottom: '1px solid #e9ecef',
            color: '#495057'
          }}>
            📋 Activity Timeline
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activity.map((activityItem) => (
              <ActivityItem 
                key={activityItem.id} 
                activity={activityItem}
                isOwnComment={activityItem.type === 'comment_updated' && activityItem.metadata?.comment_id}
              />
            ))}
          </div>
        </div>

        {/* Comments Section */}
        <CommentSection
          ticketId={id}
          comments={comments}
          pagination={commentsPagination}
          onLoadMore={handleLoadMoreComments}
        />
      </div>
    </div>
  );
}
