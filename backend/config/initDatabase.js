import { query } from './database.js';

// 创建所有数据库表
export const createTables = async () => {
  console.log('🚀 开始创建数据库表...');

  try {
    // 0. 扩展与全文检索配置
    await query('CREATE EXTENSION IF NOT EXISTS postgis');
    // 避免本地/容器缺少 chinese 配置导致索引创建失败：先用 simple 复制一个占位配置
    await query("CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS chinese ( COPY = simple )");

    // 1. 权限表
    await query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        permission_code VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255) NOT NULL
      )
    `);

    // 2. 省份表
    await query(`
      CREATE TABLE IF NOT EXISTS provinces (
        id SERIAL PRIMARY KEY,
        iso_code VARCHAR(10) UNIQUE NOT NULL,
        zh_name VARCHAR(50) NOT NULL,
        en_name VARCHAR(50) NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // 3. 用户表
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        callsign VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user'
          CHECK (role IN ('system_admin', 'pota_representative', 'park_reviewer', 'user', 'banned')),
        
        -- 状态信息
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP WITH TIME ZONE,
        
        -- 时间戳
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. 角色权限表
    await query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role VARCHAR(20) NOT NULL,
        permission_id INTEGER NOT NULL REFERENCES permissions(id),
        PRIMARY KEY (role, permission_id)
      )
    `);

    // 5. 呼号变更申请表
    await query(`
      CREATE TABLE IF NOT EXISTS callsign_change_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        
        -- 变更信息
        current_callsign VARCHAR(20) NOT NULL,
        requested_callsign VARCHAR(20) NOT NULL,
        reason TEXT NOT NULL,
        
        -- 审核信息
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected')),
        reviewer_id INTEGER REFERENCES users(id),
        review_notes TEXT,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        
        -- 时间戳
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. 用户信息修改记录表
    await query(`
      CREATE TABLE IF NOT EXISTS user_info_changes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        
        -- 修改信息
        field_name VARCHAR(50) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        change_reason TEXT,
        
        -- 状态信息
        status VARCHAR(20) NOT NULL DEFAULT 'completed'
          CHECK (status IN ('pending', 'completed', 'rejected')),
        approved_by INTEGER REFERENCES users(id),
        notes TEXT,
        
        -- 时间戳
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- 约束
        CONSTRAINT valid_fields CHECK (field_name IN ('email', 'password_hash', 'callsign'))
      )
    `);

    // 6.1 Refresh Token（随机串 + 落库 + rotation + 重放检测）
    await query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_id UUID NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,

        issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP WITH TIME ZONE,

        -- sliding 15 天
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        -- absolute 90 天
        absolute_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

        revoked_at TIMESTAMP WITH TIME ZONE,
        replaced_by INTEGER REFERENCES refresh_tokens(id),

        user_agent TEXT,
        ip INET
      )
    `);

    // 6.2 用户管理审计日志（封禁/解封不需要理由；修改角色必须理由，由业务层约束）
    await query(`
      CREATE TABLE IF NOT EXISTS user_admin_audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(50) NOT NULL
          CHECK (action IN ('user_role_changed', 'user_disabled', 'user_enabled', 'refresh_token_reuse_detected')),

        operator_id INTEGER REFERENCES users(id),
        target_user_id INTEGER REFERENCES users(id),

        old_role VARCHAR(20),
        new_role VARCHAR(20),
        old_is_active BOOLEAN,
        new_is_active BOOLEAN,

        reason TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. 公园申请表
    await query(`
      CREATE TABLE IF NOT EXISTS park_applications (
        id SERIAL PRIMARY KEY,
        dx_entity VARCHAR(20) NOT NULL UNIQUE,
        park_name VARCHAR(255) NOT NULL,
        park_type VARCHAR(100),
        province_iso_code VARCHAR(10) NOT NULL REFERENCES provinces(iso_code),
        
        -- WGS84 地理位置信息
        location GEOMETRY(GEOMETRY, 4326) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        
        -- 基本信息
        website VARCHAR(500),
        description TEXT,
        
        -- 访问和激活方法 - JSONB 格式存储
        access_methods JSONB NOT NULL DEFAULT '[]',
        activation_methods JSONB NOT NULL DEFAULT '[]',
        
        -- 申请和状态信息
        applicant_id INTEGER NOT NULL REFERENCES users(id),
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'pota_synced', 'rejected')),
        rejection_reason TEXT,
        
        -- POTA 录入信息
        pota_synced_at TIMESTAMP WITH TIME ZONE,
        pota_synced_by INTEGER REFERENCES users(id),
        pota_notes TEXT,
        
        -- 确认信息
        confirmed_authenticity BOOLEAN NOT NULL DEFAULT false,
        
        -- 时间戳
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- 约束
        CONSTRAINT valid_lat_range CHECK (latitude BETWEEN -90 AND 90),
        CONSTRAINT valid_lng_range CHECK (longitude BETWEEN -180 AND 180)
      )
    `);

    // 8. 申请审核记录表
    await query(`
      CREATE TABLE IF NOT EXISTS application_audit_logs (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES park_applications(id) ON DELETE CASCADE,
        
        -- 操作信息
        action VARCHAR(50) NOT NULL
          CHECK (action IN ('submitted', 'approved', 'rejected', 'reverted_approved', 'reverted_rejected', 'pota_synced')),
        
        -- 操作者信息
        operator_id INTEGER NOT NULL REFERENCES users(id),
        operator_role VARCHAR(20) NOT NULL,
        
        -- 状态变化
        old_status VARCHAR(20),
        new_status VARCHAR(20),
        
        -- 操作详情
        notes TEXT,
        
        -- 时间戳
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. 审核提醒表
    await query(`
      CREATE TABLE IF NOT EXISTS review_reminders (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES park_applications(id) ON DELETE CASCADE,
        reminded_by INTEGER NOT NULL REFERENCES users(id),
        reminded_to INTEGER REFERENCES users(id),
        reminder_type VARCHAR(50) NOT NULL DEFAULT 'general'
          CHECK (reminder_type IN ('general', 'urgent', 'escalated')),
        notes TEXT,
        is_acknowledged BOOLEAN DEFAULT false,
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        acknowledged_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ 数据库表创建完成');
  } catch (error) {
    console.error('❌ 创建数据库表失败:', error);
    throw error;
  }
};

// 创建索引
export const createIndexes = async () => {
  console.log('🔍 开始创建索引...');

  try {
    // 用户表索引
    await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_callsign ON users(callsign)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');

    // 省份表索引
    await query('CREATE INDEX IF NOT EXISTS idx_provinces_iso_code ON provinces(iso_code)');
    await query('CREATE INDEX IF NOT EXISTS idx_provinces_active ON provinces(is_active)');

    // 公园申请表索引
    await query('CREATE INDEX IF NOT EXISTS idx_park_location_4326 ON park_applications USING GIST (location)');
    await query('CREATE INDEX IF NOT EXISTS idx_park_name_text ON park_applications USING GIN (to_tsvector(\'chinese\', park_name))');
    await query('CREATE INDEX IF NOT EXISTS idx_dx_entity ON park_applications(dx_entity)');
    await query('CREATE INDEX IF NOT EXISTS idx_applicant_status ON park_applications(applicant_id, status)');
    await query('CREATE INDEX IF NOT EXISTS idx_province_status ON park_applications(province_iso_code, status)');
    await query('CREATE INDEX IF NOT EXISTS idx_coordinates ON park_applications(latitude, longitude)');
    await query('CREATE INDEX IF NOT EXISTS idx_access_methods ON park_applications USING GIN (access_methods)');
    await query('CREATE INDEX IF NOT EXISTS idx_activation_methods ON park_applications USING GIN (activation_methods)');

    // 审核记录表索引
    await query('CREATE INDEX IF NOT EXISTS idx_audit_application ON application_audit_logs (application_id, created_at DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_audit_operator ON application_audit_logs (operator_id, created_at DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_audit_action ON application_audit_logs (action, created_at DESC)');

    // 呼号变更申请表索引
    await query('CREATE INDEX IF NOT EXISTS idx_callsign_requests_user ON callsign_change_requests (user_id, created_at DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_callsign_requests_status ON callsign_change_requests (status, created_at DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_callsign_requests_callsign ON callsign_change_requests (requested_callsign)');

    // 用户信息修改记录表索引
    await query('CREATE INDEX IF NOT EXISTS idx_user_changes_user ON user_info_changes (user_id, created_at DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_user_changes_field ON user_info_changes (field_name, status, created_at DESC)');

    // Refresh token 索引
    await query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id, revoked_at, expires_at)');
    await query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens (family_id, revoked_at)');
    await query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_absolute_exp ON refresh_tokens (absolute_expires_at)');

    // 用户管理审计日志索引
    await query('CREATE INDEX IF NOT EXISTS idx_user_admin_audit_target ON user_admin_audit_logs (target_user_id, created_at DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_user_admin_audit_operator ON user_admin_audit_logs (operator_id, created_at DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_user_admin_audit_action ON user_admin_audit_logs (action, created_at DESC)');

    // 审核提醒表索引
    await query('CREATE INDEX IF NOT EXISTS idx_reminder_application ON review_reminders (application_id, created_at DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_reminder_to ON review_reminders (reminded_to, is_acknowledged, created_at DESC)');

    console.log('✅ 索引创建完成');
  } catch (error) {
    console.error('❌ 创建索引失败:', error);
    throw error;
  }
};

// 创建触发器和函数
export const createFunctionsAndTriggers = async () => {
  console.log('⚙️ 开始创建函数和触发器...');

  try {
    // 1. 自动更新 updated_at 的函数
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // 2. 应用 updated_at 触发器
    await query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users
    `);
    await query(`
      CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_park_applications_updated_at ON park_applications
    `);
    await query(`
      CREATE TRIGGER update_park_applications_updated_at 
      BEFORE UPDATE ON park_applications 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await query(`
      DROP TRIGGER IF EXISTS update_callsign_requests_updated_at ON callsign_change_requests
    `);
    await query(`
      CREATE TRIGGER update_callsign_requests_updated_at 
      BEFORE UPDATE ON callsign_change_requests 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // 3. 权限检查函数
    await query(`
      CREATE OR REPLACE FUNCTION user_has_permission(
        p_user_id INTEGER,
        p_permission_code VARCHAR(50)
      ) RETURNS BOOLEAN AS $$
      DECLARE
        has_perm BOOLEAN;
      BEGIN
        SELECT COUNT(*) > 0 INTO has_perm
        FROM users u
        JOIN role_permissions rp ON u.role = rp.role
        JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = p_user_id 
          AND u.is_active = true
          AND p.permission_code = p_permission_code;
        
        RETURN has_perm;
      END;
      $$ LANGUAGE plpgsql
    `);

    // 4. 用户信息修改权限检查函数
    await query(`
      CREATE OR REPLACE FUNCTION can_modify_user_info(
        p_operator_id INTEGER,
        p_target_user_id INTEGER,
        p_field VARCHAR(50)
      ) RETURNS BOOLEAN AS $$
      DECLARE
        operator_role VARCHAR(20);
      BEGIN
        -- 获取操作者角色
        SELECT role INTO operator_role FROM users WHERE id = p_operator_id AND is_active = true;
        
        -- 系统管理员可以修改所有信息
        IF operator_role = 'system_admin' THEN
          RETURN TRUE;
        END IF;
        
        -- 普通用户只能修改自己的基本信息（非角色、非呼号变更）
        IF p_operator_id = p_target_user_id THEN
          IF p_field IN ('email', 'password_hash') THEN
            RETURN TRUE;
          END IF;
        END IF;
        
        -- 呼号变更需要特殊权限
        IF p_field = 'callsign' THEN
          RETURN user_has_permission(p_operator_id, 'approve_callsign_change');
        END IF;
        
        RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql
    `);

    console.log('✅ 函数和触发器创建完成');
  } catch (error) {
    console.error('❌ 创建函数和触发器失败:', error);
    throw error;
  }
};

// 初始化基础数据
export const initializeData = async () => {
  console.log('📝 开始初始化基础数据...');

  try {
    // 1. 初始化权限数据
    await query(`
      INSERT INTO permissions (permission_code, description) VALUES
      ('create_user', '创建用户'),
      ('modify_user_info', '修改用户信息'),
      ('modify_user_role', '修改用户角色'),
      ('delete_user', '删除用户'),
      ('approve_callsign_change', '批准呼号变更'),
      ('view_all_users', '查看所有用户'),
      ('submit_application', '发起申请'),
      ('view_application_list', '查看申请列表'),
      ('view_application_detail', '查看申请详情'),
      ('review_application', '审核申请'),
      ('remind_review', '提醒审核'),
      ('sync_to_pota', '将公园数据录入到POTA系统')
      ON CONFLICT (permission_code) DO NOTHING
    `);

    // 2. 初始化角色权限
    await query(`
      INSERT INTO role_permissions (role, permission_id) VALUES
      -- 系统管理员 - 所有权限 (1-13)
      ('system_admin', 1), ('system_admin', 2), ('system_admin', 3), 
      ('system_admin', 4), ('system_admin', 5), ('system_admin', 6),
      ('system_admin', 7), ('system_admin', 8), ('system_admin', 9), 
      ('system_admin', 10), ('system_admin', 11), ('system_admin', 12), ('system_admin', 13),
      
      -- POTA 地图代表 - 7、8、9、10、11、12、13
      ('pota_representative', 7), ('pota_representative', 8), ('pota_representative', 9), 
      ('pota_representative', 10), ('pota_representative', 11), ('pota_representative', 12), ('pota_representative', 13),
      
      -- 公园申请审核员 - 7、8、9、10、11
      ('park_reviewer', 7), ('park_reviewer', 8), ('park_reviewer', 9), 
      ('park_reviewer', 10), ('park_reviewer', 11),
      
      -- 普通用户 - 7、8、9
      ('user', 7), ('user', 8), ('user', 9)
      ON CONFLICT (role, permission_id) DO NOTHING
    `);

    // 3. 初始化省份数据
    await query(`
      INSERT INTO provinces (iso_code, zh_name, en_name, sort_order) VALUES
      ('CN-BJ', '北京市', 'Beijing', 1),
      ('CN-TJ', '天津市', 'Tianjin', 2),
      ('CN-HE', '河北省', 'Hebei', 3),
      ('CN-SX', '山西省', 'Shanxi', 4),
      ('CN-NM', '内蒙古自治区', 'Inner Mongolia', 5),
      ('CN-LN', '辽宁省', 'Liaoning', 6),
      ('CN-JL', '吉林省', 'Jilin', 7),
      ('CN-HL', '黑龙江省', 'Heilongjiang', 8),
      ('CN-SH', '上海市', 'Shanghai', 9),
      ('CN-JS', '江苏省', 'Jiangsu', 10),
      ('CN-ZJ', '浙江省', 'Zhejiang', 11),
      ('CN-AH', '安徽省', 'Anhui', 12),
      ('CN-FJ', '福建省', 'Fujian', 13),
      ('CN-JX', '江西省', 'Jiangxi', 14),
      ('CN-SD', '山东省', 'Shandong', 15),
      ('CN-HA', '河南省', 'Henan', 16),
      ('CN-HB', '湖北省', 'Hubei', 17),
      ('CN-HN', '湖南省', 'Hunan', 18),
      ('CN-GD', '广东省', 'Guangdong', 19),
      ('CN-GX', '广西壮族自治区', 'Guangxi', 20),
      ('CN-HI', '海南省', 'Hainan', 21),
      ('CN-CQ', '重庆市', 'Chongqing', 22),
      ('CN-SC', '四川省', 'Sichuan', 23),
      ('CN-GZ', '贵州省', 'Guizhou', 24),
      ('CN-YN', '云南省', 'Yunnan', 25),
      ('CN-XZ', '西藏自治区', 'Tibet', 26),
      ('CN-SN', '陕西省', 'Shaanxi', 27),
      ('CN-GS', '甘肃省', 'Gansu', 28),
      ('CN-QH', '青海省', 'Qinghai', 29),
      ('CN-NX', '宁夏回族自治区', 'Ningxia', 30),
      ('CN-XJ', '新疆维吾尔自治区', 'Xinjiang', 31),
      ('CN-HK', '香港特别行政区', 'Hong Kong', 32),
      ('CN-MO', '澳门特别行政区', 'Macao', 33),
      ('CN-TW', '台湾省', 'Taiwan', 34)
      ON CONFLICT (iso_code) DO NOTHING
    `);

    console.log('✅ 基础数据初始化完成');
  } catch (error) {
    console.error('❌ 初始化基础数据失败:', error);
    throw error;
  }
};

// 完整的数据库初始化
export const initializeDatabase = async () => {
  try {
    await createTables();
    await createIndexes();
    await createFunctionsAndTriggers();
    await initializeData();
    console.log('🎉 数据库初始化完成！');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
};