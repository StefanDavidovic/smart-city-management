import React, { useState, useEffect } from "react";
import "./UserManagement.css";

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface UserSession {
  id: number;
  created_at: string;
  expires_at: string;
}

const API_GATEWAY_URL = "http://localhost:8000/api";

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [showSessions, setShowSessions] = useState<number | null>(null);

  const [newUser, setNewUser] = useState({
    email: "",
    username: "",
    password: "",
    full_name: "",
  });

  const [editForm, setEditForm] = useState({
    username: "",
    full_name: "",
    email: "",
  });

  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_GATEWAY_URL}/auth/users`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API_GATEWAY_URL}/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    } catch (err) {
      console.error("Failed to fetch current user");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_GATEWAY_URL}/auth/register`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(newUser),
      });
      if (!response.ok) throw new Error("Failed to create user");
      await fetchUsers();
      setShowAddUser(false);
      setNewUser({ email: "", username: "", password: "", full_name: "" });
    } catch (err) {
      setError("Failed to create user");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const response = await fetch(
        `${API_GATEWAY_URL}/auth/users/${editingUser.id}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(editForm),
        }
      );
      if (!response.ok) throw new Error("Failed to update user");
      await fetchUsers();
      setEditingUser(null);
    } catch (err) {
      setError("Failed to update user");
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const response = await fetch(
        `${API_GATEWAY_URL}/auth/users/${userId}/role`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (!response.ok) throw new Error("Failed to update role");
      await fetchUsers();
    } catch (err) {
      setError("Failed to update user role");
    }
  };

  const handleStatusToggle = async (userId: number, isActive: boolean) => {
    try {
      const response = await fetch(
        `${API_GATEWAY_URL}/auth/users/${userId}/status`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ is_active: !isActive }),
        }
      );
      if (!response.ok) throw new Error("Failed to update status");
      await fetchUsers();
    } catch (err) {
      setError("Failed to update user status");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const response = await fetch(`${API_GATEWAY_URL}/auth/users/${userId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to delete user");
      await fetchUsers();
    } catch (err) {
      setError("Failed to delete user");
    }
  };

  const fetchUserSessions = async (userId: number) => {
    try {
      const response = await fetch(
        `${API_GATEWAY_URL}/auth/users/${userId}/sessions`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error("Failed to fetch sessions");
      const data = await response.json();
      setUserSessions(data.sessions);
      setShowSessions(userId);
    } catch (err) {
      setError("Failed to fetch user sessions");
    }
  };

  const revokeAllSessions = async (userId: number) => {
    if (!confirm("Are you sure you want to revoke all sessions for this user?"))
      return;
    try {
      const response = await fetch(
        `${API_GATEWAY_URL}/auth/users/${userId}/sessions/revoke-all`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error("Failed to revoke sessions");
      await fetchUserSessions(userId);
    } catch (err) {
      setError("Failed to revoke sessions");
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "#e53e3e";
      case "user":
        return "#3182ce";
      case "guest":
        return "#718096";
      default:
        return "#a0aec0";
    }
  };

  if (loading) {
    return <div className="loading">Loading user management...</div>;
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h1>User Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddUser(true)}
        >
          Add New User
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Full Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.full_name || "-"}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    style={{
                      backgroundColor: getRoleColor(user.role),
                      color: "white",
                    }}
                    disabled={user.id === currentUser?.id}
                  >
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                    <option value="guest">Guest</option>
                  </select>
                </td>
                <td>
                  <button
                    className={`status-btn ${
                      user.is_active ? "active" : "inactive"
                    }`}
                    onClick={() => handleStatusToggle(user.id, user.is_active)}
                    disabled={user.id === currentUser?.id}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => {
                        setEditingUser(user);
                        setEditForm({
                          username: user.username,
                          full_name: user.full_name || "",
                          email: user.email,
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => fetchUserSessions(user.id)}
                    >
                      Sessions
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={user.id === currentUser?.id}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add New User</h2>
              <button onClick={() => setShowAddUser(false)}>×</button>
            </div>
            <form onSubmit={handleAddUser} className="modal-form">
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Full Name:</label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, full_name: e.target.value })
                  }
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Create User
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddUser(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit User</h2>
              <button onClick={() => setEditingUser(null)}>×</button>
            </div>
            <form onSubmit={handleUpdateUser} className="modal-form">
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) =>
                    setEditForm({ ...editForm, username: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Full Name:</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, full_name: e.target.value })
                  }
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Update User
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSessions && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>User Sessions</h2>
              <button onClick={() => setShowSessions(null)}>×</button>
            </div>
            <div className="sessions-content">
              <div className="sessions-header">
                <p>Active sessions for user ID: {showSessions}</p>
                <button
                  className="btn btn-danger"
                  onClick={() => revokeAllSessions(showSessions)}
                >
                  Revoke All Sessions
                </button>
              </div>
              <div className="sessions-list">
                {userSessions.map((session) => (
                  <div key={session.id} className="session-item">
                    <div className="session-info">
                      <strong>Session ID:</strong> {session.id}
                    </div>
                    <div className="session-info">
                      <strong>Created:</strong>{" "}
                      {new Date(session.created_at).toLocaleString()}
                    </div>
                    <div className="session-info">
                      <strong>Expires:</strong>{" "}
                      {new Date(session.expires_at).toLocaleString()}
                    </div>
                  </div>
                ))}
                {userSessions.length === 0 && (
                  <p className="no-sessions">No active sessions</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
