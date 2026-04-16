import { useState } from "react";
import {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "../api/usersApi";
import type {
  AppUser,
  UserRole,
  CreateUserPayload,
  UpdateUserPayload,
} from "../types/users";
import toast from "react-hot-toast";
import "./AdminPanel.css";

type ModalMode = "create" | "edit" | null;

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  pm: "Project Manager",
  member: "Członek zespołu",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "role--admin",
  pm: "role--pm",
  member: "role--member",
  viewer: "role--viewer",
};

export default function AdminPanel() {
  const { data: users = [], isLoading, isError } = useListUsersQuery();
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  // Form state
  const [formUsername, setFormUsername] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("member");
  const [formPhone, setFormPhone] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  function resetForm() {
    setFormUsername("");
    setFormEmail("");
    setFormFirstName("");
    setFormLastName("");
    setFormPassword("");
    setFormRole("member");
    setFormPhone("");
  }

  function openCreate() {
    resetForm();
    setEditingUser(null);
    setModalMode("create");
  }

  function openEdit(user: AppUser) {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormEmail(user.email || "");
    setFormFirstName(user.first_name || "");
    setFormLastName(user.last_name || "");
    setFormPassword("");
    setFormRole(user.profile?.role || "member");
    setFormPhone(user.profile?.phone || "");
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingUser(null);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (modalMode === "create") {
      const payload: CreateUserPayload = {
        username: formUsername,
        email: formEmail,
        first_name: formFirstName,
        last_name: formLastName,
        password: formPassword,
        role: formRole,
        phone: formPhone,
      };
      try {
        await createUser(payload).unwrap();
        toast.success("Użytkownik utworzony!");
        closeModal();
      } catch (err: unknown) {
        const msg =
          typeof err === "object" && err && "data" in err
            ? JSON.stringify((err as { data: unknown }).data)
            : "Błąd tworzenia użytkownika";
        toast.error(msg);
      }
    } else if (modalMode === "edit" && editingUser) {
      const payload: UpdateUserPayload = {};
      if (formUsername !== editingUser.username)
        payload.username = formUsername;
      if (formEmail !== (editingUser.email || "")) payload.email = formEmail;
      if (formFirstName !== (editingUser.first_name || ""))
        payload.first_name = formFirstName;
      if (formLastName !== (editingUser.last_name || ""))
        payload.last_name = formLastName;
      if (formPassword) payload.password = formPassword;
      if (formRole !== (editingUser.profile?.role || "member"))
        payload.role = formRole;
      if (formPhone !== (editingUser.profile?.phone || ""))
        payload.phone = formPhone;

      try {
        await updateUser({ id: editingUser.id, data: payload }).unwrap();
        toast.success("Użytkownik zaktualizowany!");
        closeModal();
      } catch (err: unknown) {
        const msg =
          typeof err === "object" && err && "data" in err
            ? JSON.stringify((err as { data: unknown }).data)
            : "Błąd aktualizacji";
        toast.error(msg);
      }
    }
  }

  async function handleDelete(userId: number) {
    try {
      await deleteUser(userId).unwrap();
      toast.success("Użytkownik usunięty!");
      setDeleteConfirm(null);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err && "data" in err
          ? JSON.stringify((err as { data: unknown }).data)
          : "Błąd usuwania";
      toast.error(msg);
      setDeleteConfirm(null);
    }
  }

  // Filtering
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      u.username.toLowerCase().includes(q) ||
      (u.first_name || "").toLowerCase().includes(q) ||
      (u.last_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q);

    const matchesRole =
      roleFilter === "all" || (u.profile?.role || "member") === roleFilter;

    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.profile?.role === "admin").length,
    pms: users.filter((u) => u.profile?.role === "pm").length,
    members: users.filter(
      (u) => !u.profile?.role || u.profile?.role === "member",
    ).length,
    viewers: users.filter((u) => u.profile?.role === "viewer").length,
  };

  if (isLoading) {
    return (
      <div className="ap">
        <div className="ap__loading">
          <div className="ap__spinner" />
          <p>Ładowanie użytkowników…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="ap">
        <div className="ap__error">
          <span className="ap__error-icon">⚠️</span>
          <p>Nie udało się załadować listy użytkowników.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ap">
      {/* ─── HEADER ─── */}
      <div className="ap__header">
        <div className="ap__header-left">
          <h1 className="ap__title" id="admin-panel-title">
            <span className="ap__title-icon">⚙️</span>
            Panel Administracyjny
          </h1>
          <p className="ap__subtitle">
            Zarządzaj użytkownikami — twórz, edytuj role i usuwaj konta.
          </p>
        </div>
        <button
          className="ap__create-btn"
          onClick={openCreate}
          id="create-user-btn"
        >
          <span className="ap__create-plus">+</span>
          Dodaj użytkownika
        </button>
      </div>

      {/* ─── STATS ─── */}
      <div className="ap__stats">
        <div className="ap__stat">
          <div className="ap__stat-value">{stats.total}</div>
          <div className="ap__stat-label">Wszyscy</div>
        </div>
        <div className="ap__stat ap__stat--admin">
          <div className="ap__stat-value">{stats.admins}</div>
          <div className="ap__stat-label">Admini</div>
        </div>
        <div className="ap__stat ap__stat--pm">
          <div className="ap__stat-value">{stats.pms}</div>
          <div className="ap__stat-label">PM</div>
        </div>
        <div className="ap__stat ap__stat--member">
          <div className="ap__stat-value">{stats.members}</div>
          <div className="ap__stat-label">Członkowie</div>
        </div>
        <div className="ap__stat ap__stat--viewer">
          <div className="ap__stat-value">{stats.viewers}</div>
          <div className="ap__stat-label">Viewerzy</div>
        </div>
      </div>

      {/* ─── FILTERS ─── */}
      <div className="ap__filters">
        <div className="ap__search-wrap">
          <svg
            className="ap__search-icon"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M13 13l4 4" strokeLinecap="round" />
          </svg>
          <input
            className="ap__search"
            placeholder="Szukaj użytkownika…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="search-users-input"
          />
        </div>
        <select
          className="ap__role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
          id="role-filter-select"
        >
          <option value="all">Wszystkie role</option>
          <option value="admin">Admin</option>
          <option value="pm">PM</option>
          <option value="member">Członek</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      {/* ─── TABLE ─── */}
      <div className="ap__table-wrap">
        <table className="ap__table" id="users-table">
          <thead>
            <tr>
              <th>Użytkownik</th>
              <th>E-mail</th>
              <th>Rola</th>
              <th>Telefon</th>
              <th className="ap__th-center">Zadania</th>
              <th className="ap__th-center">Ukończone</th>
              <th className="ap__th-right">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="ap__empty-row">
                  Brak użytkowników spełniających kryteria.
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const role = u.profile?.role || "member";
                return (
                  <tr key={u.id} className="ap__row" data-user-id={u.id}>
                    <td>
                      <div className="ap__user-cell">
                        <div className="ap__user-avatar">
                          {(u.first_name || u.username)[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="ap__user-name">
                            {u.first_name && u.last_name
                              ? `${u.first_name} ${u.last_name}`
                              : u.username}
                          </div>
                          <div className="ap__user-login">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="ap__email">{u.email || "—"}</td>
                    <td>
                      <span className={`ap__role-badge ${ROLE_COLORS[role]}`}>
                        {ROLE_LABELS[role]}
                      </span>
                    </td>
                    <td className="ap__phone">{u.profile?.phone || "—"}</td>
                    <td className="ap__center">{u.tasks_count ?? 0}</td>
                    <td className="ap__center">
                      <span className="ap__done-badge">
                        {u.done_tasks_count ?? 0}
                      </span>
                    </td>
                    <td className="ap__actions-cell">
                      <button
                        className="ap__action-btn ap__action-edit"
                        title="Edytuj"
                        onClick={() => openEdit(u)}
                        data-testid={`edit-user-${u.id}`}
                      >
                        ✏️
                      </button>
                      {deleteConfirm === u.id ? (
                        <span className="ap__confirm-group">
                          <button
                            className="ap__action-btn ap__action-yes"
                            onClick={() => handleDelete(u.id)}
                            data-testid={`confirm-delete-${u.id}`}
                          >
                            ✓
                          </button>
                          <button
                            className="ap__action-btn ap__action-no"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            ✗
                          </button>
                        </span>
                      ) : (
                        <button
                          className="ap__action-btn ap__action-delete"
                          title="Usuń"
                          onClick={() => setDeleteConfirm(u.id)}
                          data-testid={`delete-user-${u.id}`}
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── MODAL ─── */}
      {modalMode && (
        <div className="ap__overlay" onClick={closeModal}>
          <div
            className="ap__modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="modal-title"
          >
            <div className="ap__modal-header">
              <h2 id="modal-title" className="ap__modal-title">
                {modalMode === "create"
                  ? "Nowy użytkownik"
                  : `Edytuj: ${editingUser?.username}`}
              </h2>
              <button
                className="ap__modal-close"
                onClick={closeModal}
                aria-label="Zamknij"
              >
                ×
              </button>
            </div>

            <form className="ap__form" onSubmit={handleSubmit}>
              <div className="ap__form-grid">
                <div className="ap__field">
                  <label htmlFor="field-username">Login *</label>
                  <input
                    id="field-username"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="np. jkowalski"
                  />
                </div>

                <div className="ap__field">
                  <label htmlFor="field-email">E-mail</label>
                  <input
                    id="field-email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="jan@example.com"
                  />
                </div>

                <div className="ap__field">
                  <label htmlFor="field-first-name">Imię</label>
                  <input
                    id="field-first-name"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    placeholder="Jan"
                  />
                </div>

                <div className="ap__field">
                  <label htmlFor="field-last-name">Nazwisko</label>
                  <input
                    id="field-last-name"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    placeholder="Kowalski"
                  />
                </div>

                <div className="ap__field">
                  <label htmlFor="field-password">
                    Hasło {modalMode === "edit" && "(zostaw puste = bez zmian)"}
                    {modalMode === "create" && "*"}
                  </label>
                  <input
                    id="field-password"
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required={modalMode === "create"}
                    minLength={6}
                    placeholder="Min. 6 znaków"
                  />
                </div>

                <div className="ap__field">
                  <label htmlFor="field-role">Rola</label>
                  <select
                    id="field-role"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                  >
                    <option value="admin">Administrator</option>
                    <option value="pm">Project Manager</option>
                    <option value="member">Członek zespołu</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div className="ap__field ap__field--full">
                  <label htmlFor="field-phone">Telefon</label>
                  <input
                    id="field-phone"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+48123456789"
                  />
                </div>
              </div>

              <div className="ap__form-footer">
                <button
                  type="button"
                  className="ap__btn-secondary"
                  onClick={closeModal}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="ap__btn-primary"
                  disabled={creating || updating}
                  id="submit-user-btn"
                >
                  {creating || updating
                    ? "Zapisywanie…"
                    : modalMode === "create"
                      ? "Utwórz użytkownika"
                      : "Zapisz zmiany"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
