// frontend/assets/js/notifications.js - Toast Notifications (DriftIQ Redesign)

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
        display: flex;
        flex-direction: column;
        gap: 8px;
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
      border-radius: 10px;
      padding: 14px 16px;
      color: white;
      font-size: 13px;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      line-height: 1.5;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      backdrop-filter: blur(16px);
    `;

    const iconMap = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };

    const messageElement = document.createElement("span");
    messageElement.style.cssText = "flex: 1;";
    messageElement.textContent = `${iconMap[type] || "ℹ️"} ${message}`;

    const closeButton = document.createElement("button");
    closeButton.innerHTML = "×";
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s ease;
      flex-shrink: 0;
    `;
    closeButton.onmouseenter = () => (closeButton.style.color = "white");
    closeButton.onmouseleave = () => (closeButton.style.color = "rgba(255, 255, 255, 0.6)");

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
    if (!notification || !notification.parentNode) return;
    notification.style.animation = "fadeOut 0.3s ease-out";
    setTimeout(() => {
      if (notification.parentNode) notification.remove();
    }, 300);
  }

  getBackgroundColor(type) {
    const colors = {
      success: "rgba(16, 185, 129, 0.15)",
      error: "rgba(248, 81, 73, 0.15)",
      warning: "rgba(255, 165, 0, 0.15)",
      info: "rgba(0, 245, 212, 0.15)",
    };
    return colors[type] || colors.info;
  }

  getBorderColor(type) {
    const colors = {
      success: "rgba(16, 185, 129, 0.3)",
      error: "rgba(248, 81, 73, 0.3)",
      warning: "rgba(255, 165, 0, 0.3)",
      info: "rgba(0, 245, 212, 0.3)",
    };
    return colors[type] || colors.info;
  }
}

const notify = new NotificationManager();
