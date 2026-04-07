"use client";

import React, { createContext, useContext } from "react";

type NotificationType = "success" | "error" | "info" | "warning";

interface Notification {
  title: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  showNotification: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

// Empty implementation for open source version
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // No-op notification function for open source version
  const showNotification = (_notification: Notification) => {
    // Do nothing in open source version
    console.log("NotificationProvider: showNotification called", _notification);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
