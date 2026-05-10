-- ============================================================
-- Academic Research & Learning Management Platform
-- Complete PostgreSQL Database Schema
-- Version: 1.0.0
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'super_admin', 'admin', 'professor', 'phd_scholar',
  'pg_student', 'project_student', 'ug_student', 'external_examiner'
);

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');

CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

CREATE TYPE research_type AS ENUM ('phd', 'mphil', 'postdoc', 'project', 'dissertation', 'thesis');

CREATE TYPE milestone_status AS ENUM (
  'not_started', 'in_progress', 'completed', 'delayed',
  'partial', 'need_help', 'submitted', 'awaiting_review', 'approved', 'rejected'
);

CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical', 'urgent');

CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused', 'holiday');

CREATE TYPE submission_status AS ENUM (
  'draft', 'submitted', 'under_review', 'revision_needed',
  'approved', 'rejected', 'graded'
);

CREATE TYPE exam_type AS ENUM ('mcq', 'long_answer', 'mixed', 'viva', 'quiz', 'presentation');

CREATE TYPE notification_type AS ENUM (
  'task_assigned', 'deadline_reminder', 'submission_received',
  'grade_published', 'message', 'announcement', 'system', 'meeting_scheduled'
);

CREATE TYPE meeting_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');

CREATE TYPE certificate_type AS ENUM (
  'course_completion', 'attendance', 'workshop', 'research_training', 'achievement'
);

-- ============================================================
-- INSTITUTIONS & DEPARTMENTS
-- ============================================================

CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  pincode VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  logo_url TEXT,
  established_year INTEGER,
  accreditation TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  head_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(institution_id, code)
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID REFERENCES institutions(id),
  department_id UUID REFERENCES departments(id),
  role user_role NOT NULL DEFAULT 'pg_student',
  status user_status DEFAULT 'pending_verification',
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  gender gender_type,
  date_of_birth DATE,
  address TEXT,
  designation VARCHAR(255),
  employee_id VARCHAR(100),
  student_id VARCHAR(100),
  enrollment_number VARCHAR(100),
  qualification TEXT,
  specialization VARCHAR(255),
  research_area TEXT,
  bio TEXT,
  linkedin_url VARCHAR(255),
  orcid_id VARCHAR(50),
  scopus_id VARCHAR(100),
  google_scholar_url VARCHAR(255),
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP WITH TIME ZONE,
  last_active TIMESTAMP WITH TIME ZONE,
  password_changed_at TIMESTAMP WITH TIME ZONE,
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP WITH TIME ZONE,
  verify_token VARCHAR(255),
  fcm_token TEXT,
  notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true, "in_app": true}',
  preferences JSONB DEFAULT '{"theme": "light", "language": "en"}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) NOT NULL,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- RESEARCH SCHOLAR MANAGEMENT
-- ============================================================

CREATE TABLE research_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  department_id UUID REFERENCES departments(id),
  guide_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  research_domain VARCHAR(255),
  code VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE research_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES research_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(group_id, user_id)
);

CREATE TABLE research_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  department_id UUID REFERENCES departments(id),
  group_id UUID REFERENCES research_groups(id),
  scholar_id UUID NOT NULL REFERENCES users(id),
  guide_id UUID NOT NULL REFERENCES users(id),
  co_guide_id UUID REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  abstract TEXT,
  type research_type NOT NULL,
  registration_number VARCHAR(100),
  registration_date DATE,
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  keywords TEXT[],
  domain VARCHAR(255),
  funding_agency VARCHAR(255),
  funding_amount DECIMAL(12,2),
  external_collaborators JSONB DEFAULT '[]',
  tags TEXT[],
  ai_risk_score DECIMAL(5,2),
  ai_insights JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE research_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE,
  duration_hours DECIMAL(5,2),
  attachments TEXT[],
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE publications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES research_projects(id),
  scholar_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  type VARCHAR(100) NOT NULL,
  journal_conference VARCHAR(500),
  publisher VARCHAR(255),
  doi VARCHAR(255),
  isbn VARCHAR(50),
  publication_date DATE,
  status VARCHAR(100) DEFAULT 'in_preparation',
  impact_factor DECIMAL(6,3),
  citations INTEGER DEFAULT 0,
  co_authors TEXT[],
  abstract TEXT,
  file_url TEXT,
  link_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- GOALS & MILESTONES
-- ============================================================

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES research_projects(id),
  group_id UUID REFERENCES research_groups(id),
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID NOT NULL REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  priority task_priority DEFAULT 'medium',
  status milestone_status DEFAULT 'not_started',
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern VARCHAR(50),
  attachments TEXT[],
  resources TEXT[],
  remarks TEXT,
  guide_remarks TEXT,
  tags TEXT[],
  ai_generated BOOLEAN DEFAULT FALSE,
  reminder_enabled BOOLEAN DEFAULT TRUE,
  reminder_days INTEGER[] DEFAULT '{1,3,7}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE goal_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  status milestone_status DEFAULT 'not_started',
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  attachments TEXT[],
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE goal_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  updated_by UUID NOT NULL REFERENCES users(id),
  old_status milestone_status,
  new_status milestone_status,
  old_percentage INTEGER,
  new_percentage INTEGER,
  comment TEXT,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- CLASSES & COURSES
-- ============================================================

CREATE TABLE academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  department_id UUID REFERENCES departments(id),
  academic_year_id UUID REFERENCES academic_years(id),
  instructor_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  code VARCHAR(100),
  description TEXT,
  thumbnail_url TEXT,
  category VARCHAR(100),
  level VARCHAR(50),
  language VARCHAR(50) DEFAULT 'English',
  duration_hours DECIMAL(6,2),
  is_published BOOLEAN DEFAULT FALSE,
  is_self_paced BOOLEAN DEFAULT FALSE,
  enrollment_limit INTEGER,
  enrollment_open BOOLEAN DEFAULT TRUE,
  prerequisites TEXT[],
  learning_objectives TEXT[],
  tags TEXT[],
  rating DECIMAL(3,2) DEFAULT 0,
  total_enrolled INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  certificate_issued BOOLEAN DEFAULT FALSE,
  UNIQUE(course_id, user_id)
);

CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  duration_minutes INTEGER,
  is_published BOOLEAN DEFAULT FALSE,
  unlock_after_module_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE course_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  content_url TEXT,
  content_text TEXT,
  duration_minutes INTEGER,
  order_index INTEGER NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  is_free_preview BOOLEAN DEFAULT FALSE,
  resources JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES course_lessons(id),
  user_id UUID NOT NULL REFERENCES users(id),
  watched_duration INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lesson_id, user_id)
);

-- ============================================================
-- ATTENDANCE
-- ============================================================

CREATE TABLE class_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id),
  instructor_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255),
  type VARCHAR(50) DEFAULT 'lecture',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  location VARCHAR(255),
  is_online BOOLEAN DEFAULT FALSE,
  meeting_url TEXT,
  qr_code VARCHAR(255),
  attendance_open BOOLEAN DEFAULT FALSE,
  attendance_method VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  status attendance_status DEFAULT 'absent',
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  marked_by UUID REFERENCES users(id),
  method VARCHAR(50) DEFAULT 'manual',
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  remarks TEXT,
  UNIQUE(session_id, user_id)
);

-- ============================================================
-- ASSIGNMENTS
-- ============================================================

CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id),
  group_id UUID REFERENCES research_groups(id),
  created_by UUID NOT NULL REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  instructions TEXT,
  type VARCHAR(50) DEFAULT 'file_upload',
  max_marks DECIMAL(6,2),
  passing_marks DECIMAL(6,2),
  due_date TIMESTAMP WITH TIME ZONE,
  available_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  allow_late_submission BOOLEAN DEFAULT FALSE,
  late_penalty_percent INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 1,
  allowed_file_types TEXT[],
  max_file_size INTEGER,
  rubric JSONB,
  plagiarism_check BOOLEAN DEFAULT FALSE,
  peer_review BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  student_id UUID NOT NULL REFERENCES users(id),
  status submission_status DEFAULT 'draft',
  content TEXT,
  file_urls TEXT[],
  submitted_at TIMESTAMP WITH TIME ZONE,
  attempt_number INTEGER DEFAULT 1,
  is_late BOOLEAN DEFAULT FALSE,
  marks_obtained DECIMAL(6,2),
  grade VARCHAR(5),
  feedback TEXT,
  rubric_scores JSONB,
  plagiarism_score DECIMAL(5,2),
  graded_by UUID REFERENCES users(id),
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- EXAMINATIONS
-- ============================================================

CREATE TABLE question_banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  department_id UUID REFERENCES departments(id),
  subject VARCHAR(255) NOT NULL,
  unit VARCHAR(255),
  bloom_taxonomy_level VARCHAR(50),
  type VARCHAR(50) NOT NULL,
  question TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  marks DECIMAL(5,2) DEFAULT 1,
  difficulty VARCHAR(20) DEFAULT 'medium',
  tags TEXT[],
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id),
  created_by UUID NOT NULL REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  instructions TEXT,
  type exam_type NOT NULL,
  total_marks DECIMAL(6,2),
  passing_marks DECIMAL(6,2),
  duration_minutes INTEGER,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT FALSE,
  allow_review BOOLEAN DEFAULT TRUE,
  shuffle_questions BOOLEAN DEFAULT TRUE,
  shuffle_options BOOLEAN DEFAULT TRUE,
  negative_marking BOOLEAN DEFAULT FALSE,
  negative_marks_per_wrong DECIMAL(4,2) DEFAULT 0,
  ai_proctoring BOOLEAN DEFAULT FALSE,
  max_attempts INTEGER DEFAULT 1,
  show_result_immediately BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE exam_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_bank_id UUID REFERENCES question_banks(id),
  question TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  options JSONB,
  correct_answer TEXT,
  marks DECIMAL(5,2) NOT NULL,
  order_index INTEGER,
  explanation TEXT
);

CREATE TABLE exam_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES exams(id),
  student_id UUID NOT NULL REFERENCES users(id),
  attempt_number INTEGER DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  time_taken_seconds INTEGER,
  status VARCHAR(50) DEFAULT 'in_progress',
  answers JSONB DEFAULT '{}',
  marks_obtained DECIMAL(6,2),
  percentage DECIMAL(5,2),
  grade VARCHAR(5),
  passed BOOLEAN,
  proctoring_events JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- FILE MANAGEMENT
-- ============================================================

CREATE TABLE file_storage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  related_to UUID,
  related_type VARCHAR(100),
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(500) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  folder_path VARCHAR(500) DEFAULT '/',
  is_public BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES file_storage(id),
  tags TEXT[],
  description TEXT,
  download_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE file_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES file_storage(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  priority VARCHAR(20) DEFAULT 'normal',
  action_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- MEETINGS & VIDEO CALLS
-- ============================================================

CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organized_by UUID NOT NULL REFERENCES users(id),
  research_project_id UUID REFERENCES research_projects(id),
  research_group_id UUID REFERENCES research_groups(id),
  course_id UUID REFERENCES courses(id),
  title VARCHAR(500) NOT NULL,
  agenda TEXT,
  type VARCHAR(50) DEFAULT 'online',
  platform VARCHAR(50) DEFAULT 'jitsi',
  meeting_url TEXT,
  meeting_id VARCHAR(255),
  password VARCHAR(100),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status meeting_status DEFAULT 'scheduled',
  recording_url TEXT,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE meeting_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'participant',
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  attendance_status VARCHAR(50) DEFAULT 'invited',
  UNIQUE(meeting_id, user_id)
);

-- ============================================================
-- CERTIFICATIONS
-- ============================================================

CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  issued_by UUID NOT NULL REFERENCES users(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  type certificate_type NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  certificate_number VARCHAR(100) UNIQUE NOT NULL,
  qr_code TEXT,
  pdf_url TEXT,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until DATE,
  course_id UUID REFERENCES courses(id),
  metadata JSONB DEFAULT '{}',
  digital_signature TEXT,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PERFORMANCE & ANALYTICS
-- ============================================================

CREATE TABLE performance_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  academic_year_id UUID REFERENCES academic_years(id),
  semester INTEGER,
  attendance_score DECIMAL(5,2) DEFAULT 0,
  assignment_score DECIMAL(5,2) DEFAULT 0,
  exam_score DECIMAL(5,2) DEFAULT 0,
  goal_completion_score DECIMAL(5,2) DEFAULT 0,
  research_activity_score DECIMAL(5,2) DEFAULT 0,
  participation_score DECIMAL(5,2) DEFAULT 0,
  overall_score DECIMAL(5,2) DEFAULT 0,
  grade VARCHAR(5),
  rank INTEGER,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- CHAT (MongoDB schema reference — stored in MongoDB)
-- ============================================================
-- Collections: conversations, messages, read_receipts
-- See: src/models/chat/

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_institution ON users(institution_id);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_research_projects_scholar ON research_projects(scholar_id);
CREATE INDEX idx_research_projects_guide ON research_projects(guide_id);
CREATE INDEX idx_goals_assigned_to ON goals(assigned_to);
CREATE INDEX idx_goals_due_date ON goals(due_date);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_attendance_session ON attendance_records(session_id);
CREATE INDEX idx_attendance_user ON attendance_records(user_id);
CREATE INDEX idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_student ON assignment_submissions(student_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_files_uploader ON file_storage(uploaded_by);
CREATE INDEX idx_publications_scholar ON publications(scholar_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Full-text search indexes
CREATE INDEX idx_research_projects_fts ON research_projects USING gin(to_tsvector('english', title || ' ' || COALESCE(abstract, '')));
CREATE INDEX idx_courses_fts ON courses USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_research_projects_updated_at BEFORE UPDATE ON research_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_exams_updated_at BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_meetings_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_institutions_updated_at BEFORE UPDATE ON institutions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
