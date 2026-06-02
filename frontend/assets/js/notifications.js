// frontend/assets/js/notifications.js - Toast Notifications

class NotificationManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create notification container if it doesn't exist
    if (!document.getElementById("notification-container")) {
      this.container = document.createElement("div");
      this.container.id = "notification-container";
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
      `;
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById("notification-container");
    }
  }

  show(message, type = "info", duration = 4000) {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type} animate-slide-in-left`;
    notification.style.cssText = `
      background: ${this.getBackgroundColor(type)};
      border: 1px solid ${this.getBorderColor(type)};
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 10px;
      color: white;
      font-size: 14px;
      line-height: 1.5;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    `;

    const messageElement = document.createElement("span");
    messageElement.textContent = message;

    const closeButton = document.createElement("button");
    closeButton.innerHTML = "×";
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    closeButton.onclick = () => this.remove(notification);

    notification.appendChild(messageElement);
    notification.appendChild(closeButton);

    this.container.appendChild(notification);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => this.remove(notification), duration);
    }

    return notification;
  }

  success(message, duration = 4000) {
    return this.show(message, "success", duration);
  }

  error(message, duration = 5000) {
    return this.show(message, "error", duration);
  }

  warning(message, duration = 4000) {
    return this.show(message, "warning", duration);
  }

  info(message, duration = 4000) {
    return this.show(message, "info", duration);
  }

  remove(notification) {
    notification.style.animation = "fadeOut 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }

  getBackgroundColor(type) {
    const colors = {
      success: "rgba(57, 255, 133, 0.2)",
      error: "rgba(255, 77, 92, 0.2)",
      warning: "rgba(255, 165, 0, 0.2)",
      info: "rgba(0, 229, 255, 0.2)",
    };
    return colors[type] || colors.info;
  }

  getBorderColor(type) {
    const colors = {
      success: "#39ff85",
      error: "#ff4d5c",
      warning: "#ffa500",
      info: "#00e5ff",
    };
    return colors[type] || colors.info;
  }
}

const notify = new NotificationManager();
