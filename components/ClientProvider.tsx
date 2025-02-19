"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export default function ClientProvider({ children, ...props }: React.ComponentProps<typeof ThemeProvider>) {
  return <ThemeProvider {...props}>{children}</ThemeProvider>;
}
