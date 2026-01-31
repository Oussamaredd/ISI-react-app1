#!/bin/bash

# Architecture Redesign Implementation Script
# This script will help migrate to the new clean architecture

set -e

echo "🏗️  Starting Architecture Redesign..."

# Phase 1: Create packages directory structure
echo "📦 Creating packages directory structure..."
mkdir -p packages/{config,types,utils,ui,database,logger,validation,testing,eslint-config,typescript-config,tailwind-config}

# Create basic package.json for each package
create_package_json() {
    local package_name=$1
    local package_dir="packages/$package_name"
    
    cat > "$package_dir/package.json" << EOF
{
  "name": "@ticket-system/$package_name",
  "version": "1.0.0",
  "description": "$package_name package for ticket management system",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "lint": "eslint src --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "keywords": ["ticket-system", "monorepo"],
  "author": "",
  "license": "MIT",
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "eslint": "^8.0.0"
  }
}
EOF

    echo "✅ Created $package_dir/package.json"
}

# Create package.json for each package
packages=("config" "types" "utils" "ui" "database" "logger" "validation" "testing" "eslint-config" "typescript-config" "tailwind-config")
for package in "${packages[@]}"; do
    create_package_json "$package"
done

# Phase 2: Create basic directory structures
echo "📁 Creating directory structures..."

# Types package
mkdir -p packages/types/src
cat > packages/types/src/index.ts << 'EOF'
// Core types for the ticket management system

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  hotelId?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'user';
  hotelId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Hotel {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  ticketId: string;
  userId: string;
  action: string;
  details?: Record<string, any>;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
}
EOF

# Utils package
mkdir -p packages/utils/src
cat > packages/utils/src/index.ts << 'EOF'
// Common utility functions

export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const snakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

export const camelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};
EOF

# Config package
mkdir -p packages/config/src
cat > packages/config/src/index.ts << 'EOF'
// Shared configuration

export const API_ENDPOINTS = {
  TICKETS: '/api/tickets',
  USERS: '/api/users',
  HOTELS: '/api/hotels',
  AUTH: '/api/auth',
  DASHBOARD: '/api/dashboard',
} as const;

export const TICKET_STATUSES = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  AGENT: 'agent',
  USER: 'user',
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 2000,
} as const;
EOF

# UI package structure
mkdir -p packages/ui/src/{components,hooks,styles}
cat > packages/ui/src/index.ts << 'EOF'
// Main UI exports will go here
export * from './components';
export * from './hooks';
EOF

mkdir -p packages/ui/src/components/{Button,Input,Modal,Table}
cat > packages/ui/src/components/index.ts << 'EOF'
// Component exports
export * from './Button';
export * from './Input';
export * from './Modal';
export * from './Table';
EOF

# Create basic Button component
cat > packages/ui/src/components/Button/index.tsx << 'EOF'
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};
EOF

# Validation package
mkdir -p packages/validation/src
cat > packages/validation/src/index.ts << 'EOF'
// Zod schemas for validation
import { z } from 'zod';

export const TicketSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long'),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assignedTo: z.string().optional(),
  hotelId: z.string().optional(),
});

export const UserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'agent', 'user']),
  hotelId: z.string().optional(),
});

export const HotelSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email'),
});

export const CommentSchema = z.object({
  id: z.string().optional(),
  ticketId: z.string().min(1, 'Ticket ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  content: z.string().min(1, 'Comment is required'),
});

export type TicketInput = z.infer<typeof TicketSchema>;
export type UserInput = z.infer<typeof UserSchema>;
export type HotelInput = z.infer<typeof HotelSchema>;
export type CommentInput = z.infer<typeof CommentSchema>;
EOF

# Testing package
mkdir -p packages/testing/src/{mocks,fixtures}
cat > packages/testing/src/index.ts << 'EOF'
// Testing utilities

import { vi } from 'vitest';

export const createMockTicket = (overrides = {}) => ({
  id: 'ticket-1',
  title: 'Test Ticket',
  description: 'Test Description',
  status: 'open',
  priority: 'medium',
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockHotel = (overrides = {}) => ({
  id: 'hotel-1',
  name: 'Test Hotel',
  address: 'Test Address',
  phone: '123-456-7890',
  email: 'hotel@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Mock API responses
export const mockApiResponse = (data: any, success = true) => ({
  success,
  data,
  message: success ? 'Success' : 'Error',
});

// Mock localStorage
export const createMockLocalStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};
EOF

# Phase 3: Update workspace configuration
echo "⚙️  Updating workspace configuration..."

# Update root package.json
if [ -f "package.json" ]; then
    # Backup original
    cp package.json package.json.backup
    
    # Update workspaces array
    sed -i.bak 's|"workspaces": \[|"workspaces": [|g' package.json
    sed -i.bak 's|"apps/\*"|"apps/*",|g' package.json
    sed -i.bak '/"apps/\*",/a\    "packages/*"' package.json
    
    echo "✅ Updated package.json workspaces"
fi

# Create pnpm-workspace.yaml
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Create basic turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
EOF

echo "✅ Created pnpm-workspace.yaml and turbo.json"

# Phase 4: Rename apps for clarity
echo "🔄 Renaming apps for clarity..."
if [ -d "apps/client" ]; then
    mv apps/client apps/web
    echo "✅ Renamed apps/client to apps/web"
fi

if [ -d "apps/server" ]; then
    mv apps/server apps/api
    echo "✅ Renamed apps/server to apps/api"
fi

echo "🎉 Architecture redesign foundation complete!"
echo ""
echo "Next steps:"
echo "1. Run 'pnpm install' to install dependencies"
echo "2. Update app imports to use shared packages"
echo "3. Migrate existing code to use new structure"
echo "4. Update CI/CD workflows"
echo "5. Run tests to verify everything works"
echo ""
echo "Check the ARCHITECTURE_REDESIGN.md file for detailed guidance."