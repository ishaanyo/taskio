"use client";

import { useEffect, useMemo, useState } from "react";
import "./globals.css";

const API = "";
const PRIORITY = { 4: "P1", 3: "P2", 2: "P3", 1: "P4" };
const COLORS = ["#db4c3f", "#eb8909", "#246fe0", "#299438", "#884dff", "#808080"];

function priorityColor(p) {
  return { 4: "var(--p1)", 3: "var(--p2)", 2: "var(--p3)", 1: "var(--p4)" }[p] || "var(--p4)";
}

async function api(path, token, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function Page() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState({ type: "inbox", title: "Inbox" });
  const [draft, setDraft] = useState({ content: "", priority: 1, due_date: "", due_time: "" });
  const [projectName, setProjectName] = useState("");
  const [editing, setEditing] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("taskio_token");
    const savedUser = localStorage.getItem("taskio_user");
    if (saved && savedUser) {
      setToken(saved);
      setUser(JSON.parse(savedUser));
    }
    setReady(true);
  }, []);

  async function refresh(nextToken = token, nextView = view) {
    const projectData = await api("/api/projects", nextToken);
    setProjects(projectData.projects);
    const query = nextView.type === "project" ? `?project_id=${nextView.id}` : `?view=${nextView.type}`;
    const taskData = await api(`/api/tasks${query}`, nextToken);
    setTasks(taskData.tasks);
  }

  useEffect(() => {
    if (!token) return;
    refresh().catch((e) => setError(e.message));
  }, [token, view.type, view.id]);

  async function submitAuth(e) {
    e.preventDefault();
    setError("");
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const data = await api(path, null, { method: "POST", body: JSON.stringify(authForm) });
      localStorage.setItem("taskio_token", data.token);
      localStorage.setItem("taskio_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    localStorage.removeItem("taskio_token");
    localStorage.removeItem("taskio_user");
    setToken("");
    setUser(null);
    setTasks([]);
    setProjects([]);
  }

  async function addTask(e) {
    e.preventDefault();
    if (!draft.content.trim()) return;
    const projectId = view.type === "project" ? view.id : projects.find((p) => p.is_inbox)?.id;
    await api("/api/tasks", token, {
      method: "POST",
      body: JSON.stringify({
        content: draft.content,
        priority: Number(draft.priority),
        due_date: draft.due_date || null,
        due_time: draft.due_time || null,
        project_id: projectId,
      }),
    });
    setDraft({ content: "", priority: 1, due_date: "", due_time: "" });
    refresh();
  }

  async function toggle(task) {
    await api(`/api/tasks/${task.id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ is_completed: !task.is_completed }),
    });
    refresh();
  }

  async function saveEdit(e) {
    e.preventDefault();
    await api(`/api/tasks/${editing.id}`, token, {
      method: "PATCH",
      body: JSON.stringify({
        content: editing.content,
        description: editing.description,
        priority: Number(editing.priority),
        due_date: editing.due_date || null,
        due_time: editing.due_time || null,
        project_id: editing.project_id,
      }),
    });
    setEditing(null);
    refresh();
  }

  async function removeTask(id) {
    await api(`/api/tasks/${id}`, token, { method: "DELETE" });
    setEditing(null);
    refresh();
  }

  async function addProject(e) {
    e.preventDefault();
    if (!projectName.trim()) return;
    const color = COLORS[projects.length % COLORS.length];
    await api("/api/projects", token, {
      method: "POST",
      body: JSON.stringify({ name: projectName, color }),
    });
    setProjectName("");
    refresh();
  }

  const grouped = useMemo(() => {
    if (view.type !== "upcoming") return { Tasks: tasks };
    return tasks.reduce((acc, task) => {
      const key = task.due_date || "No date";
      acc[key] = acc[key] || [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [tasks, view.type]);

  if (!ready) return null;

  if (!token) {
    return (
      <div className="auth">
        <form className="card" onSubmit={submitAuth}>
          <div className="brand"><span className="mark">✓</span> Taskio</div>
          <p style={{ color: "var(--muted)" }}>Projects, due date & time, and priority — like Todoist.</p>
          {mode === "register" && (
            <input placeholder="Name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />
          )}
          <div style={{ height: 8 }} />
          <input placeholder="Email" type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
          <div style={{ height: 8 }} />
          <input placeholder="Password" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="primary" type="submit">{mode === "login" ? "Log in" : "Sign up"}</button>
            <button className="ghost" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Create account" : "Have an account? Log in"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="mark">✓</span> Taskio</div>
        {[{ type: "inbox", title: "Inbox" }, { type: "today", title: "Today" }, { type: "upcoming", title: "Upcoming" }].map((item) => (
          <button key={item.type} className={`nav-btn ${view.type === item.type ? "active" : ""}`} onClick={() => setView(item)}>{item.title}</button>
        ))}
        <div className="section-label">PROJECTS</div>
        {projects.filter((p) => !p.is_inbox).map((project) => (
          <button key={project.id} className={`project-btn ${view.id === project.id ? "active" : ""}`} onClick={() => setView({ type: "project", id: project.id, title: project.name })}>
            <span className="dot" style={{ background: project.color }} />
            {project.name}
            <span className="count">{project.open_count}</span>
          </button>
        ))}
        <form className="row" onSubmit={addProject}>
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Add project" />
          <button className="primary" type="submit">+</button>
        </form>
        <button className="ghost" onClick={logout} style={{ marginTop: 18 }}>{user?.name} · Log out</button>
      </aside>
      <main className="main">
        <h1>{view.title}</h1>
        <form className="composer" onSubmit={addTask}>
          <input type="text" placeholder="Task name" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
          <div className="row">
            <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
              <option value={4}>P1</option>
              <option value={3}>P2</option>
              <option value={2}>P3</option>
              <option value={1}>P4</option>
            </select>
            <input type="date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} />
            <input type="time" value={draft.due_time} onChange={(e) => setDraft({ ...draft, due_time: e.target.value })} />
            <button className="primary" type="submit">Add task</button>
          </div>
        </form>
        {tasks.length === 0 && <div className="empty">No tasks here. Add one above.</div>}
        {Object.entries(grouped).map(([label, items]) => (
          <section key={label}>
            {view.type === "upcoming" && <div className="section-label">{label}</div>}
            {items.map((task) => (
              <div className={`task ${task.is_completed ? "done" : ""}`} key={task.id}>
                <button className="check" style={{ borderColor: priorityColor(task.priority) }} onClick={() => toggle(task)} />
                <div onClick={() => setEditing(task)} style={{ cursor: "pointer" }}>
                  <div className="content">{task.content}</div>
                  <div className="meta">
                    <span className="pill" style={{ color: priorityColor(task.priority) }}>{PRIORITY[task.priority]}</span>
                    {task.due_date && <span>{task.due_date}{task.due_time ? ` ${task.due_time}` : ""}</span>}
                    {task.description && <span>{task.description}</span>}
                  </div>
                </div>
                <button className="ghost" onClick={() => removeTask(task.id)}>Delete</button>
              </div>
            ))}
          </section>
        ))}
      </main>
      {editing && (
        <div className="modal-bg" onClick={() => setEditing(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit}>
            <h3>Edit task</h3>
            <input value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
            <div style={{ height: 8 }} />
            <textarea rows={3} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Description" />
            <div className="row">
              <select value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })}>
                <option value={4}>P1</option>
                <option value={3}>P2</option>
                <option value={2}>P3</option>
                <option value={1}>P4</option>
              </select>
              <input type="date" value={editing.due_date || ""} onChange={(e) => setEditing({ ...editing, due_date: e.target.value })} />
              <input type="time" value={editing.due_time || ""} onChange={(e) => setEditing({ ...editing, due_time: e.target.value })} />
              <select value={editing.project_id} onChange={(e) => setEditing({ ...editing, project_id: e.target.value })}>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="row">
              <button className="primary" type="submit">Save</button>
              <button className="ghost" type="button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
