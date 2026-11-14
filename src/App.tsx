import ChillZone from "./ChillZone";
import Orb from "./Orb";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DndContext, PointerSensor, TouchSensor, useDroppable, useDraggable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, CheckCircle2, CirclePlus, LayoutDashboard, Search, Sparkles, Trash2, X } from 'lucide-react';

type Status = 'todo' | 'in_progress' | 'in_review' | 'done';
type Priority = 'low' | 'normal' | 'high';
type Task = { id: string; title: string; description: string; status: Status; priority: Priority; due_date: string | null; user_id: string; created_at: string };
const statuses: { id: Status; label: string; dot: string }[] = [{ id: 'todo', label: 'To Do', dot: '#8893a8' }, { id: 'in_progress', label: 'In Progress', dot: '#a68cff' }, { id: 'in_review', label: 'In Review', dot: '#f1b865' }, { id: 'done', label: 'Done', dot: '#5bcfa9' }];
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const db: SupabaseClient | null = url && key ? createClient(url, key) : null;

function TaskCard({
    task,
    onEdit,
}: {
    task: Task;
    onEdit: (task: Task) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: task.id,
        data: { kind: 'task', task },
    });

    const due = task.due_date
        ? new Date(task.due_date + 'T12:00:00')
        : null;

    return (
        <article
            ref={setNodeRef}
            className={`task ${isDragging ? 'dragging' : ''}`}
            style={{
                transform: CSS.Translate.toString(transform),
            }}
        >
            <div className="task-surface">
                <div className="task-top">
                    <span className={`priority ${task.priority}`}>
                        {task.priority}
                    </span>

                    <button
                        className="edit-link"
                        onClick={() => onEdit(task)}
                    >
                        Edit
                    </button>
                </div>

                <div
                    className="task-grip"
                    {...listeners}
                    {...attributes}
                    tabIndex={0}
                    aria-label={`Drag ${task.title}`}
                >
                    <h3>{task.title}</h3>

                    {task.description && (
                        <p>{task.description}</p>
                    )}
                </div>

                <div className="task-footer">
                    <span className="task-id">
                        #{task.id.slice(0, 6).toUpperCase()}
                    </span>

                    {due && (
                        <span
                            className={`due ${due.getTime() < Date.now() &&
                                task.status !== 'done'
                                ? 'overdue'
                                : ''
                                }`}
                        >
                            <CalendarDays size={13} />
                            {due.toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                            })}
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}


function Column({
  status,
  tasks,
  onEdit,
  onAdd,
}: {
  status: typeof statuses[number];
  tasks: Task[];
  onEdit: (t: Task) => void;
  onAdd: (s: Status) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
    data: {
      kind: 'column',
      status: status.id,
    },
  });

  return (
    <section
      className={'column ' + (isOver ? 'over' : '')}
      ref={setNodeRef}
    >
      <header className="column-header">
        <span className="column-name">
          <span
            className="status-dot"
            style={{ background: status.dot }}
          />
          {status.label}
          <span className="count">{tasks.length}</span>
        </span>

        <button
          className="icon-btn"
          aria-label={'Add task to ' + status.label}
          onClick={() => onAdd(status.id)}
        >
          <CirclePlus size={17} />
        </button>
      </header>

      <div className="column-body">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            onEdit={onEdit}
          />
        ))}

        {tasks.length === 0 && (
          <div className="empty">
            Drop a task here
            <br />
            or create a new one
          </div>
        )}

        <button
          className="add-column"
          onClick={() => onAdd(status.id)}
        >
          + Add task
        </button>
      </div>
    </section>
  );
}

const blank = {
  title: '',
  description: '',
  priority: 'normal' as Priority,
  due_date: '',
  status: 'todo' as Status,
};

export default function App() {
  const [userId, setUserId] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [activePage, setActivePage] = useState<"board" | "chill">("board");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 7,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    let active = true;

    async function init() {
      if (!db) {
        setError(
          'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
        );
        setLoading(false);
        return;
      }

      try {
        const {
          data: { session },
          error: sessionError,
        } = await db.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        let uid = session?.user.id;

        if (!uid) {
          const {
            data,
            error: authError,
          } = await db.auth.signInAnonymously();

          if (authError) {
            throw authError;
          }

          uid = data.user?.id;
        }

        if (!uid) {
          throw Error('Could not create guest session');
        }

        const {
          data,
          error: loadError,
        } = await db
          .from('tasks')
          .select('*')
          .order('created_at', {
            ascending: false,
          });

        if (loadError) {
          throw loadError;
        }

        if (active) {
          setUserId(uid);
          setTasks((data || []) as Task[]);
        }
      } catch (e) {
        if (active) {
          setError((e as Error).message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      active = false;
    };
  }, []);

  const shown = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (filter === 'all' || t.priority === filter) &&
          (t.title + ' ' + t.description)
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [tasks, query, filter]
  );

  const completed = tasks.filter(
    (t) => t.status === 'done'
  ).length;

  function openNew(status: Status = 'todo') {
    setEditing(null);
    setForm({
      ...blank,
      status,
    });
    setModal(true);
  }

  function openEdit(t: Task) {
    setEditing(t.id);
    setForm({
      title: t.title,
      description: t.description,
      priority: t.priority,
      due_date: t.due_date || '',
      status: t.status,
    });
    setModal(true);
  }

  async function save() {
    if (!db || !userId || !form.title.trim()) {
      return;
    }

    setSaving(true);
    setError('');

    const values = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
    };

    try {
      if (editing) {
        const { data, error } = await db
          .from('tasks')
          .update(values)
          .eq('id', editing)
          .select()
          .single();

        if (error) {
          throw error;
        }

        setTasks((prev) =>
          prev.map((t) =>
            t.id === editing ? (data as Task) : t
          )
        );
      } else {
        const { data, error } = await db
          .from('tasks')
          .insert({
            ...values,
            user_id: userId,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        setTasks((prev) => [
          data as Task,
          ...prev,
        ]);
      }

      setModal(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!db || !editing) {
      return;
    }

    if (!window.confirm('Delete this task permanently?')) {
      return;
    }

    setSaving(true);

    const { error } = await db
      .from('tasks')
      .delete()
      .eq('id', editing);

    if (error) {
      setError(error.message);
    } else {
      setTasks((prev) =>
        prev.filter((t) => t.id !== editing)
      );
      setModal(false);
    }

    setSaving(false);
  }

  async function onDragEnd(e: DragEndEvent) {
    if (!db || !e.over) {
      return;
    }

    const id = String(e.active.id);
    const target = String(e.over.id) as Status;

    if (!statuses.some((s) => s.id === target)) {
      return;
    }

    const task = tasks.find((t) => t.id === id);

    if (!task || task.status === target) {
      return;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: target }
          : t
      )
    );

    const { error } = await db
      .from('tasks')
      .update({ status: target })
      .eq('id', id);

    if (error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? task : t
        )
      );

      setError(
        'Unable to move task: ' + error.message
      );
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">✦</span>
          <span>
            orbit<span className="brand-period">.</span>
          </span>
        </div>

        <div className="workspace-label">
          WORKSPACE
        </div>

        <button
          type="button"
           className={`nav-item ${activePage === "board" ? "active" : ""}`}
           onClick={() => setActivePage("board")}
        >
          <LayoutDashboard size={17} />
          Project board
        </button>

        <button
          type="button"
          className={`nav-item ${activePage === "chill" ? "active" : ""}`}
          onClick={() => setActivePage("chill")}
        >
          <Sparkles size={17} />
          Chill Zone
        </button>

        <div className="sidebar-bottom">
          <div className="profile-icon">G</div>

          <div>
            <strong>
               {activePage === "board" ? "Project board" : "Chill Zone"}
            </strong>
            <small>Private task board</small>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="breadcrumbs">
            Workspace
            <span>/</span>
            <strong>Project board</strong>
          </div>

          <div className="top-right">
            <span className="live-dot" />
            Guest session
          </div>
        </div>

        <div className="content">
          {activePage === "board" ? (
          <>
          <div className="eyebrow">
            <Sparkles size={14} />
            YOUR PRODUCTIVITY SPACE
          </div>

          
        <div className="heading-row">
            <div className="heading-content">
                <div className="heading-text">
                    <h1>
                        Project board
                        <span className="heading-star"> ✳</span>
                    </h1>

                    <p className="subtitle">
                        Keep your ideas moving, one task at a time.
                    </p>
                </div>

                <Orb />
            </div>

             <button
                className="primary"
                disabled={!userId}
                onClick={() => openNew()}
            >
                <CirclePlus size={17} />
                New task
            </button>
        </div>


          <div className="stats">
            <div className="stat">
              <span>Total tasks</span>

              <strong>
                {tasks.length.toString().padStart(2, '0')}
              </strong>

              <small>Across your workspace</small>
            </div>

            <div className="stat">
              <span>In progress</span>

              <strong>
                {tasks
                  .filter((t) => t.status === 'in_progress')
                  .length.toString()
                  .padStart(2, '0')}
              </strong>

              <small>Currently underway</small>
            </div>

            <div className="stat">
              <span>Completed</span>

              <strong>
                {completed.toString().padStart(2, '0')}
              </strong>

              <small>Nice work, keep going</small>
            </div>

            <div className="stat progress-stat">
              <span>Completion rate</span>

              <strong>
                {tasks.length
                  ? Math.round(
                      (completed / tasks.length) * 100
                    )
                  : 0}
                %
              </strong>

              <div className="progress">
                <div
                  style={{
                    width:
                      (tasks.length
                        ? (completed / tasks.length) * 100
                        : 0) + '%',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="board-controls">
            <div>
              <h2>Board overview</h2>

              <p>
                Drag cards between columns to update progress
              </p>
            </div>

            <div className="filters">
              <label className="search">
                <Search size={16} />

                <input
                  value={query}
                  onChange={(e) =>
                    setQuery(e.target.value)
                  }
                  placeholder="Search tasks..."
                />
              </label>

              <select
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value)
                }
                aria-label="Filter by priority"
              >
                <option value="all">
                  All priorities
                </option>

                <option value="high">
                  High priority
                </option>

                <option value="normal">
                  Normal priority
                </option>

                <option value="low">
                  Low priority
                </option>
              </select>
            </div>
          </div>

          {error && (
            <div className="error" role="alert">
              {error}

              <button
                onClick={() => setError('')}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {loading ? (
            <div className="loading">
              Preparing your private workspace...
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragEnd={onDragEnd}
            >
              <div className="board">
                {statuses.map((s) => (
                  <Column
                    key={s.id}
                    status={s}
                    tasks={shown.filter(
                      (t) => t.status === s.id
                    )}
                    onEdit={openEdit}
                    onAdd={openNew}
                  />
                ))}
              </div>
            </DndContext>
          )}

          <footer>
            Made for focused teams
            <span>✦</span>
            Built with React + Supabase
                    </footer>
          </>
        ) : (
          <ChillZone />
        )}
        </div>
      </main>

      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setModal(false);
            }
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              editing ? 'Edit task' : 'Create task'
            }
          >
            <div className="modal-header">
              <div>
                <h2>
                  {editing
                    ? 'Edit task'
                    : 'Create a task'}
                </h2>

                <p>
                  Give your work a little structure.
                </p>
              </div>

              <button
                className="icon-btn"
                onClick={() => setModal(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <label>
              Task title

              <input
                maxLength={200}
                autoFocus
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                  })
                }
                placeholder="What needs to get done?"
              />
            </label>

            <label>
              Description

              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                placeholder="Add a few details (optional)"
              />
            </label>

            <div className="form-grid">
              <label>
                Status

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as Status,
                    })
                  }
                >
                  {statuses.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                    >
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Priority

                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priority: e.target.value as Priority,
                    })
                  }
                >
                  <option value="low">
                    Low
                  </option>

                  <option value="normal">
                    Normal
                  </option>

                  <option value="high">
                    High
                  </option>
                </select>
              </label>
            </div>

            <label>
              Due date

              <input
                type="date"
                value={form.due_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    due_date: e.target.value,
                  })
                }
              />
            </label>

            <div className="modal-actions">
              {editing && (
                <button
                  className="danger"
                  disabled={saving}
                  onClick={remove}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              )}

              <div className="action-right">
                <button
                  className="secondary"
                  onClick={() => setModal(false)}
                >
                  Cancel
                </button>

                <button
                  className="primary"
                  disabled={
                    saving || !form.title.trim()
                  }
                  onClick={save}
                >
                  <CheckCircle2 size={16} />

                  {saving
                    ? 'Saving...'
                    : editing
                      ? 'Save changes'
                      : 'Create task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

