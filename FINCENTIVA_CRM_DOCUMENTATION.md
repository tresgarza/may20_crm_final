# Fincentiva CRM - Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Core Modules](#core-modules)
4. [Pages/Screens](#pages-screens)
5. [Key Features](#key-features)
6. [Deployment Guide](#deployment-guide)

## Project Overview

Fincentiva CRM is a comprehensive credit/loan management system designed to track and process credit applications. The application allows for managing clients, processing loan applications, and tracking the status of applications through various stages of approval.

The system supports multiple user roles (advisors and company administrators) with different permissions and views. It includes dashboards with metrics and visualization tools to help track performance and application status.

### Key Technologies

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: React Context
- **Routing**: React Router
- **API Communication**: Fetch API with custom handlers

## Architecture

The application follows a modern React architecture with the following key components:

### Frontend Structure
- **Pages**: Contains main application views (Applications, Clients, Dashboard, etc.)
- **Components**: Reusable UI components and page-specific components
- **Contexts**: React Context providers for state management (Auth, Permissions)
- **Services**: API communication and business logic
- **Utils**: Helper functions, constants, and utilities

### Backend Structure
- **Supabase**: PostgreSQL database with RESTful API
- **Custom Middleware**: Node.js server for enhanced SQL query handling
- **Tables**: Applications, Clients, Companies, Users, etc.
- **Authentication**: Supabase Auth with custom roles and permissions

### Data Flow
1. User interacts with UI components
2. Components trigger actions (service calls)
3. Services make API requests to Supabase directly or through custom middleware
4. Data is processed and stored in the database
5. UI updates with new data

## Core Modules

### Authentication Module
The authentication system uses Supabase Auth with a custom wrapper to manage user sessions, roles, and permissions.

**Key files:**
- `src/contexts/AuthContext.tsx`: Manages authentication state
- `src/pages/auth/Login.tsx`: Login interface
- `src/services/authService.ts`: Authentication service functions

**Features:**
- User login/logout
- Session management
- Role-based access control

### Application Management Module
This module handles all aspects of loan/credit applications from creation to approval/rejection.

**Key files:**
- `src/services/applicationService.ts`: Core application logic
- `src/pages/ApplicationForm.tsx`: Application creation/editing
- `src/pages/ApplicationDetail.tsx`: Detailed view of an application
- `src/pages/Applications.tsx`: List of applications

**Features:**
- Application creation for different financing types (Personal Credit, Product Financing)
- Status tracking
- Approval workflows
- Payment calculation

### Client Management Module
Manages client information and associated applications.

**Key files:**
- `src/services/clientService.ts`: Client management logic
- `src/pages/Clients.tsx`: Client listing
- `src/pages/ClientDetail.tsx`: Detailed client view
- `src/pages/NewClient.tsx`: Client creation interface

**Features:**
- Client registration
- Contact information management
- Association with applications

### Dashboard Module
Provides visualizations and metrics for business performance.

**Key files:**
- `src/pages/Dashboard.tsx`: Main dashboard
- `src/services/dashboardService.ts`: Dashboard data processing
- `src/components/ui/charts`: Chart components

**Features:**
- Application status distribution
- Time-based metrics
- Conversion rates

### Permissions Module
Handles role-based access control throughout the application.

**Key files:**
- `src/contexts/PermissionsContext.tsx`: Permissions management
- `src/utils/permissions.ts`: Permission helper functions

**Features:**
- Role-based UI rendering
- Access control to features
- Data filtering based on permissions

## Pages/Screens

### Dashboard
- **Purpose**: Provides overview of application metrics and performance
- **URL**: `/dashboard`
- **Key components**:
  - Status distribution chart
  - Application timeline chart
  - Amount distribution chart
  - Summary statistics (total, approved, conversion rate)
- **Actions**:
  - Filter by time period
  - Navigate to applications view

### Applications List
- **Purpose**: Displays all applications with filtering and sorting
- **URL**: `/applications`
- **View types**:
  - Kanban board (grouped by status)
  - List view (tabular)
- **Key components**:
  - Status columns (New, In Review, Approved, Rejected, etc.)
  - Application cards with key information
  - Search and filter controls
- **Actions**:
  - Create new application
  - View application details
  - Filter and search
  - Change application status

### Application Form
- **Purpose**: Creates or edits loan/credit applications
- **URL**: `/application/new` or `/application/edit/:id`
- **Key sections**:
  - Client information
  - Financing details (amount, term, interest rate)
  - Product information (for product financing)
  - Company selection
- **Types of applications**:
  - Personal Credit (`financing_type: 'personal'`)
  - Product Financing (`financing_type: 'producto'`)
- **Calculations**:
  - Monthly payment
  - Interest calculations
- **Actions**:
  - Save application
  - Reset form
  - Select existing client
  - Calculate payments

### Application Detail
- **Purpose**: Shows comprehensive information about an application
- **URL**: `/application/:id`
- **Key sections**:
  - Application information
  - Client details
  - Status and approval information
  - Company information
  - Document management
  - Application history timeline
- **Actions**:
  - Change status
  - Approve/reject application
  - Upload documents
  - View activity history

### Clients List
- **Purpose**: Displays all clients with search and filtering
- **URL**: `/clients`
- **Key components**:
  - Client cards/rows
  - Search and filter controls
- **Actions**:
  - Create new client
  - View client details
  - Edit client information
  - Search and filter

### Client Detail
- **Purpose**: Shows comprehensive information about a client
- **URL**: `/client/:id`
- **Key sections**:
  - Personal information
  - Contact details
  - Financial information
  - Applications list
  - Documents
- **Actions**:
  - Edit client information
  - Create new application
  - View client applications
  - Upload documents

### Client Form (New/Edit)
- **Purpose**: Creates or edits client information
- **URL**: `/client/new` or `/client/edit/:id`
- **Key sections**:
  - Personal information
  - Contact details
  - Financial information
  - Document upload
- **Actions**:
  - Save client
  - Upload documents
  - Cancel/Reset

### Login Page
- **Purpose**: Authenticates users
- **URL**: `/login`
- **Key components**:
  - Login form
  - Error messaging
- **Actions**:
  - Submit credentials
  - Reset password (if implemented)

## Key Features

### Credit Application Processing
- **Application creation**:
  - Personal Credit type with amounts, terms, and payment calculations
  - Product Financing type with product details and financing options
- **Status workflow**:
  - New applications start with status "Solicitud"
  - Progresses through review, approval/rejection stages
  - Status changes are tracked in history
- **Multi-level approval**:
  - Advisor approval
  - Company approval
  - Automatic status updates when both approve

### Client Management
- **Client registration** with comprehensive information:
  - Personal details
  - Contact information
  - Financial information
  - Document management
- **Client search and filtering**
- **Association with applications**

### User Roles and Permissions
- **Role types**:
  - Advisors: Create and manage applications, limited views
  - Company administrators: Approve/reject applications, company-wide views
  - System administrators: Full access
- **Permission-based UI**:
  - Different views and actions based on role
  - Data filtering based on permissions

### Dashboard and Reporting
- **Visual metrics**:
  - Application status distribution
  - Timeline of applications
  - Amount distribution
- **Performance indicators**:
  - Conversion rates
  - Total applications
  - Approved amounts
- **Filtering options** by time period

### Document Management
- **Document upload and storage**:
  - Client documents
  - Application documents
- **Document categorization**
- **Secure access control**

## Deployment Guide

### Prerequisites
- GitHub account
- Vercel account
- Supabase account with a project set up

### Step 1: Prepare Your GitHub Repository

1. Make sure your code is in the correct branch on GitHub
   - Currently the working branch is: `working-apr29-DONOTDELETE`
   - This branch contains all fixed issues and latest working code

2. Ensure your GitHub repository is public or Vercel has access to it
   - If it's a private repository, you'll need to give Vercel access during setup

### Step 2: Set Up Supabase Project

1. Log in to your Supabase account at https://app.supabase.io/
2. Create a new project if you don't have one already
   - Give it a name (e.g., "fincentiva-crm-production")
   - Choose a password for the database
   - Select a region closest to your users

3. Get your Supabase credentials:
   - Go to Project Settings → API
   - You'll need:
     - **Project URL** (e.g., https://ydnygntfkrleiseuciwq.supabase.co)
     - **anon** public key 
     - **service_role** key (keep this very secure!)

4. Set up the database schema:
   - Go to the SQL Editor in Supabase
   - You'll need to create the necessary tables. Your project likely has SQL migrations that can be run here.
   - At minimum, you'll need tables for:
     - users
     - clients
     - applications
     - companies
     - documents
     - application_history

### Step 3: Deploy to Vercel

1. Log in to your Vercel account at https://vercel.com/
2. Click "New Project"
3. Import your GitHub repository
   - Find your repository in the list
   - If you don't see it, you may need to configure Vercel to access your GitHub account

4. Configure the project:
   - **Framework Preset**: Select "Create React App"
   - **Build and Output Settings**: Use the defaults (Build command: `npm run build`)
   - **Environment Variables**: This is very important! Add these variables:
     ```
     REACT_APP_SUPABASE_URL=your_supabase_project_url
     REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
     REACT_APP_API_SERVER_URL=your_api_server_url (if using custom middleware)
     ```

5. Click "Deploy"
   - Vercel will build and deploy your application
   - This might take a few minutes

### Step 4: Set Up Custom API Server (if needed)

If your project uses the custom middleware server (supabase-mcp-server.js), you'll need to deploy it separately:

1. Create a new Node.js project on Vercel or another hosting provider
2. Deploy only the server file and its dependencies
3. Set the `REACT_APP_API_SERVER_URL` in your frontend project to point to this server

### Step 5: Configure Environment Variables

Your application needs these environment variables to work correctly:

1. In the Vercel dashboard, go to your project settings
2. Navigate to the "Environment Variables" section
3. Add the following variables:

   ```
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```

   If you're using the custom API server:
   ```
   REACT_APP_API_SERVER_URL=https://your-api-server-url
   ```

### Step 6: Set Up Continuous Deployment

1. In Vercel, your project should be set up for continuous deployment by default
2. Any commits to your main branch will trigger a new deployment
3. If you want to change this:
   - Go to your project settings in Vercel
   - Navigate to the "Git" section
   - Modify the production branch to match your working branch (`working-apr29-DONOTDELETE`)

### Step 7: Custom Domain (Optional)

1. In Vercel project settings, go to "Domains"
2. Add your custom domain
3. Follow the instructions to configure DNS settings

### Step 8: Test Your Deployment

1. After deployment completes, Vercel will provide you with a URL
2. Visit the URL to make sure your application is working correctly
3. Test all main features:
   - Login
   - Creating applications
   - Viewing dashboards
   - Client management

### Troubleshooting Deployment Issues

**Problem: API requests failing**
- Check that your environment variables are set correctly
- Verify Supabase permissions and policies
- Check CORS settings in Supabase

**Problem: Blank page after deployment**
- Check browser console for errors
- Verify that the build process completed successfully
- Check if the correct branch was deployed

**Problem: Login not working**
- Verify Supabase Auth is set up correctly
- Check that environment variables for Supabase are correct
- Ensure your signup/login routes are configured properly

**Problem: Custom API server not connecting**
- Check if the server is deployed and running
- Verify the URL is correct in environment variables
- Check for CORS issues

### Important Notes About the Project

1. **Branch Management**:
   - `working-apr29-DONOTDELETE` contains the latest working version
   - Before making changes, create a new branch from this one
   - Do not delete this branch as it's the stable version

2. **Backend Dependencies**:
   - The project relies on Supabase for data storage and authentication
   - The custom API server (supabase-mcp-server.js) is used for advanced SQL queries

3. **Deployment Frequency**:
   - Plan deployments carefully as they may affect ongoing operations
   - Test thoroughly before deploying to production

4. **Database Structure**:
   - The application has specific database requirements
   - Changes to the database structure require updating the corresponding frontend code

5. **Environment-Specific Configurations**:
   - Development environment may use different settings than production
   - Create separate Supabase projects for development and production if needed 