// frontend/assets/js/api.js - API Client

class API {
  constructor() {
    this.baseURL = "/api";
    this.token = this.getToken();
  }

  // Get JWT token from localStorage
  getToken() {
    return localStorage.getItem("driftiq_token");
  }

  // Set JWT token
  setToken(token) {
    localStorage.setItem("driftiq_token", token);
    this.token = token;
  }

  // Clear token
  clearToken() {
    localStorage.removeItem("driftiq_token");
    this.token = null;
  }

  // Get request headers
  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Make API request
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method: options.method || "GET",
      headers: this.getHeaders(),
      ...options,
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          data,
        };
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // ============ AUTH ENDPOINTS ============

  async register(email, username, password, fullName = "") {
    const response = await this.request("/auth/register", {
      method: "POST",
      body: {
        email,
        username,
        password,
        full_name: fullName,
      },
    });

    // Store the JWT token just like login does
    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async login(username, password) {
    const response = await this.request("/auth/login", {
      method: "POST",
      body: { username, password },
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async logout() {
    this.clearToken();
    return this.request("/auth/logout", { method: "POST" });
  }

  async getProfile() {
    return this.request("/auth/profile");
  }

  async changePassword(currentPassword, newPassword) {
    return this.request("/auth/password-change", {
      method: "POST",
      body: {
        current_password: currentPassword,
        new_password: newPassword,
      },
    });
  }

  async requestPasswordReset(email) {
    return this.request("/auth/password-reset/request", {
      method: "POST",
      body: { email },
    });
  }

  async confirmPasswordReset(token, newPassword) {
    return this.request("/auth/password-reset/confirm", {
      method: "POST",
      body: {
        token,
        new_password: newPassword,
      },
    });
  }

  // ============ FILE ENDPOINTS ============

  async uploadFile(file, folderId = null) {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId) formData.append("folder_id", folderId);

    const headers = { Authorization: `Bearer ${this.token}` };

    const response = await fetch(`${this.baseURL}/files/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) throw new Error("Upload failed");
    return response.json();
  }

  async getFiles(page = 1, limit = 20, folderId = null, search = null, isDeleted = false) {
    let endpoint = `/files?page=${page}&limit=${limit}`;
    if (folderId) endpoint += `&folder_id=${folderId}`;
    if (search) endpoint += `&search=${encodeURIComponent(search)}`;
    if (isDeleted) endpoint += `&is_deleted=true`;

    return this.request(endpoint);
  }

  async getFileDetails(fileId) {
    return this.request(`/files/${fileId}`);
  }

  async downloadFile(fileId) {
    window.location.href = `${this.baseURL}/files/${fileId}/download?token=${this.token}`;
  }

  async renameFile(fileId, name) {
    return this.request(`/files/${fileId}/rename`, {
      method: "PUT",
      body: { name },
    });
  }

  async moveFile(fileId, folderId) {
    return this.request(`/files/${fileId}/move`, {
      method: "POST",
      body: { folder_id: folderId },
    });
  }

  async deleteFile(fileId) {
    return this.request(`/files/${fileId}`, { method: "DELETE" });
  }

  async restoreFile(fileId) {
    return this.request(`/files/${fileId}/restore`, { method: "PATCH" });
  }

  async purgeFile(fileId) {
    return this.request(`/files/${fileId}/purge`, { method: "DELETE" });
  }

  async getStorageStats() {
    return this.request("/files/stats/usage");
  }

  async searchFiles(query, page = 1, limit = 20) {
    return this.request(
      `/files/search/query?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
    );
  }

  async toggleStar(fileId) {
    return this.request(`/files/${fileId}/star`, { method: "PATCH" });
  }

  // ============ FOLDER ENDPOINTS ============

  async createFolder(name, parentId = null, color = null) {
    return this.request("/folders", {
      method: "POST",
      body: {
        name,
        parent_id: parentId,
        color,
      },
    });
  }

  async getFolders(parentId = null) {
    let endpoint = "/folders";
    if (parentId) endpoint += `?parent_id=${parentId}`;
    return this.request(endpoint);
  }

  async getFolderDetails(folderId) {
    return this.request(`/folders/${folderId}`);
  }

  async renameFolder(folderId, name) {
    return this.request(`/folders/${folderId}/rename`, {
      method: "PUT",
      body: { name },
    });
  }

  async moveFolder(folderId, parentId) {
    return this.request(`/folders/${folderId}/move`, {
      method: "POST",
      body: { parent_id: parentId },
    });
  }

  async deleteFolder(folderId) {
    return this.request(`/folders/${folderId}`, { method: "DELETE" });
  }

  async getFolderTree() {
    return this.request("/folders/tree/structure");
  }

  // ============ SHARE ENDPOINTS ============

  async createShare(
    fileId,
    expiresAt = null,
    password = null,
    downloadLimit = null,
  ) {
    return this.request("/shares/create", {
      method: "POST",
      body: {
        file_id: fileId,
        expires_at: expiresAt,
        password,
        download_limit: downloadLimit,
      },
    });
  }

  async getUserShares(page = 1, limit = 20) {
    return this.request(`/shares/my-shares?page=${page}&limit=${limit}`);
  }

  async getSharedFile(token, password = null) {
    return this.request("/shares/public/access", {
      method: "POST",
      body: { token, password },
    });
  }

  async downloadSharedFile(token, password = null) {
    const response = await fetch(`${this.baseURL}/shares/public/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) throw new Error("Download failed");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.click();
  }

  async updateShare(shareId, updates) {
    return this.request(`/shares/${shareId}`, {
      method: "PUT",
      body: updates,
    });
  }

  async deleteShare(shareId) {
    return this.request(`/shares/${shareId}`, { method: "DELETE" });
  }

  // ============ ADMIN ENDPOINTS ============

  async getDashboard() {
    return this.request("/admin/dashboard");
  }

  async getAllUsers(page = 1, limit = 20, search = null) {
    let endpoint = `/admin/users?page=${page}&limit=${limit}`;
    if (search) endpoint += `&search=${encodeURIComponent(search)}`;
    return this.request(endpoint);
  }

  async deleteUser(userId) {
    return this.request(`/admin/users/${userId}`, { method: "DELETE" });
  }

  async getSystemLogs(page = 1, limit = 50, action = null) {
    let endpoint = `/admin/logs?page=${page}&limit=${limit}`;
    if (action) endpoint += `&action=${action}`;
    return this.request(endpoint);
  }

  async getStorageStatistics() {
    return this.request("/admin/storage/stats");
  }

  async adminGetAllFiles(page = 1, limit = 50) {
    return this.request(`/admin/files?page=${page}&limit=${limit}`);
  }

  async adminDeleteFile(fileId) {
    return this.request(`/admin/files/${fileId}`, { method: "DELETE" });
  }
}

// Create global API instance
const api = new API();
