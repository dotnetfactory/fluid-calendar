/* eslint-disable @typescript-eslint/no-unused-vars */
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

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const showNotification = (_notification: Notification) => {
    // No-op in open-source mode
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
