<template>
  <div class="section">
    <div class="fp-tablecell">
      <div id="content-containers">
        <div class="register-box">
          <!-- 登录表单 -->
          <div id="login" class="tab-content" :class="{ active: activeTab === 'login' }">
            <h1>登录</h1>
            <div class="textbox">
              <i class="fa fa-envelope"></i>
              <input type="email" placeholder="请输入邮箱地址" v-model="loginForm.email" required>
            </div>
            <div class="textbox">
              <i class="fa fa-lock"></i>
              <input type="password" placeholder="密码" v-model="loginForm.password" required>
            </div>
            <button class="btna" type="submit" @click="handleLogin">登录</button>

            <div class="login-link">
              <a href="#" @click.prevent="openTab('forget')">忘记密码</a> |
              <a href="#" @click.prevent="openTab('register')">立即注册</a>
            </div>
          </div>

          <!-- 注册表单 -->
          <div id="register" class="tab-content" :class="{ active: activeTab === 'register' }">
            <h1>用户注册</h1>
            <form id="registerForm" @submit.prevent="handleRegister">
              <div class="textbox">
                <i class="fa fa-envelope"></i>
                <input type="email" v-model="registerForm.email" placeholder="邮箱地址" required>
              </div>

              <div class="textbox">
                <i class="fa fa-lock"></i>
                <input type="password" v-model="registerForm.password" placeholder="密码" required>
              </div>

              <div class="textbox">
                <i class="fa fa-lock"></i>
                <input type="password" v-model="registerForm.confirmPassword" placeholder="确认密码" required>
              </div>

              <div class="textbox">
                <i class="fa fa-user"></i>
                <select v-model="registerForm.grade" required style="width:100%;padding:12px 20px 12px 45px;border:1px solid #ddd;border-radius:25px;outline:none;">
                  <option value="">请选择用户类型</option>
                  <option value="1">用户</option>
                  <option value="2">不知道</option>
                  <option value="3">管理员</option>
                </select>
              </div>

              <div class="textbox verification-code">
                <i class="fa fa-code" style="left:15px;top:50%;transform:translateY(-50%);"></i>
                <input type="text" v-model="registerForm.code" placeholder="验证码" required style="padding-left:45px;">
                <button type="button" @click="sendRegisterCode" :disabled="countdown > 0">
                  {{ countdown > 0 ? `${countdown}秒后可重发` : '发送验证码' }}
                </button>
              </div>

              <button class="btna" type="submit">注册</button>
            </form>

            <div class="login-link">
              <a href="#" @click.prevent="openTab('login')">已有账号？立即登录</a>
            </div>
          </div>

          <!-- 忘记密码表单 -->
          <div id="forget" class="tab-content" :class="{ active: activeTab === 'forget' }">
            <h1>忘记密码</h1>

            <!-- 步骤1：输入邮箱 -->
            <div class="step" :class="{ active: forgetStep === 1 }">
              <div class="textbox">
                <i class="fa fa-envelope"></i>
                <input type="email" placeholder="请输入邮箱地址" v-model="forgetForm.email" required>
              </div>
              <button class="btna" @click="sendVerificationCode">发送验证码</button>
              <div class="back-to-login">
                <a href="#" @click.prevent="openTab('login')">返回登录</a>
              </div>
            </div>

            <!-- 步骤2：输入验证码和新密码 -->
            <div class="step" :class="{ active: forgetStep === 2 }">
              <div class="textbox">
                <i class="fa fa-envelope"></i>
                <input type="email" placeholder="邮箱地址" v-model="forgetForm.confirmEmail" readonly>
              </div>
              <div class="textbox">
                <i class="fa fa-key"></i>
                <input type="text" placeholder="验证码" v-model="forgetForm.code" required>
              </div>
              <div class="textbox">
                <i class="fa fa-lock"></i>
                <input type="password" placeholder="新密码" v-model="forgetForm.password" required>
              </div>
              <div class="textbox">
                <i class="fa fa-lock"></i>
                <input type="password" placeholder="确认新密码" v-model="forgetForm.confirmPassword" required>
              </div>
              <button class="btna" @click="changePassword">重置密码</button>
              <div class="back-to-login">
                <a href="#" @click.prevent="openTab('login')">返回登录</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuth } from '../composables/useAuth' // 导入 useAuth
import { ElMessage } from 'element-plus' // 导入 Element Plus 消息组件

// 使用 useAuth composable
const { login: authLogin } = useAuth()

// 标签页状态
const activeTab = ref('login')
const forgetStep = ref(1)
const countdown = ref(0)
let countdownTimer = null

// 表单数据
const loginForm = reactive({
  email: '',
  password: ''
})

const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  grade: '',
  code: ''
})

const forgetForm = reactive({
  email: '',
  confirmEmail: '',
  code: '',
  password: '',
  confirmPassword: ''
})

// 切换标签页
function openTab(tabName) {
  activeTab.value = tabName

  // 如果是忘记密码页面，确保第一步显示
  if (tabName === 'forget') {
    forgetStep.value = 1
  }
}

// 发送注册验证码
async function sendRegisterCode() {
  const email = registerForm.email

  // 验证邮箱是否输入
  if (!email) {
    ElMessage.error('请输入邮箱地址')
    return
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    ElMessage.error('请输入有效的邮箱地址')
    return
  }

  try {
    // 发送验证码请求
    const response = await fetch('https://luren.online:2345/proxy/sendCode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `email=${encodeURIComponent(email)}`
    })

    const data = await response.json()

    if (data.code === 200) {
      ElMessage.success('验证码已发送到您的邮箱，请查收')
      startCountdown()
    } else {
      ElMessage.error(data.message || '验证码发送失败')
    }
  } catch (error) {
    console.error('发送验证码错误:', error)
    ElMessage.error('发送验证码过程中发生错误')
  }
}

// 忘记密码步骤切换
async function sendVerificationCode() {
  const email = forgetForm.email

  // 验证邮箱是否输入
  if (!email) {
    ElMessage.error('请输入邮箱地址')
    return
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    ElMessage.error('请输入有效的邮箱地址')
    return
  }

  try {
    // 发送请求到后端发送验证码
    const response = await fetch('https://luren.online:2345/proxy/forgetPassword', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `email=${encodeURIComponent(email)}`
    })

    const data = await response.json()

    if (data.code === 200) {
      // 发送成功
      forgetForm.confirmEmail = email
      forgetStep.value = 2
      ElMessage.success('验证码已发送到您的邮箱，请查收')
    } else {
      // 发送失败
      ElMessage.error(data.message || '发送验证码失败')
    }
  } catch (error) {
    console.error('发送验证码错误:', error)
    ElMessage.error('发送验证码过程中发生错误')
  }
}

// 重置密码
async function changePassword() {
  const { confirmEmail, code, password, confirmPassword } = forgetForm

  // 基本验证
  if (!confirmEmail || !code || !password || !confirmPassword) {
    ElMessage.error('请填写所有必填字段')
    return
  }

  // 验证密码长度
  if (password.length < 6) {
    ElMessage.error('密码长度至少为6位')
    return
  }

  // 验证两次密码是否一致
  if (password !== confirmPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }

  try {
    // 发送请求到后端修改密码
    const response = await fetch('https://luren.online:2345/proxy/changePassword', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `email=${encodeURIComponent(confirmEmail)}&code=${encodeURIComponent(code)}&password=${encodeURIComponent(password)}`
    })

    const data = await response.json()

    if (data.code === 200) {
      // 修改成功
      ElMessage.success('密码重置成功！')

      // 清空表单
      Object.keys(forgetForm).forEach(key => forgetForm[key] = '')

      // 返回登录页面
      openTab('login')
    } else {
      // 修改失败
      ElMessage.error(data.message || '密码重置失败')
    }
  } catch (error) {
    console.error('重置密码错误:', error)
    ElMessage.error('重置密码过程中发生错误')
  }
}

// 处理登录逻辑 - 使用 useAuth 中的登录方法
async function handleLogin() {
  const { email, password } = loginForm

  // 基本验证
  if (!email || !password) {
    ElMessage.error('请输入邮箱和密码')
    return
  }

  // 使用 useAuth 中的登录方法
  const result = await authLogin(email, password)

  // 注意：不需要手动处理跳转和成功消息，useAuth 已经处理了
  if (!result.success) {
    // 错误消息已经在 useAuth 中处理
    return
  }
}

// 处理注册逻辑
async function handleRegister() {
  const { email, password, confirmPassword, grade, code } = registerForm

  // 基本验证
  if (!email || !password || !confirmPassword || !grade || !code) {
    ElMessage.error('请填写所有必填字段')
    return
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    ElMessage.error('请输入有效的邮箱地址')
    return
  }

  // 验证密码长度
  if (password.length < 6) {
    ElMessage.error('密码长度至少为6位')
    return
  }

  // 验证两次密码是否一致
  if (password !== confirmPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }

  try {
    // 发送注册请求
    const response = await fetch('https://luren.online:2345/proxy/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&code=${encodeURIComponent(code)}&grade=${encodeURIComponent(grade)}`
    })

    const data = await response.json()

    if (data.code === 200) {
      // 注册成功
      ElMessage.success('注册成功！')

      // 清空表单
      Object.keys(registerForm).forEach(key => registerForm[key] = '')

      // 切换到登录页面
      openTab('login')
    } else {
      // 注册失败
      ElMessage.error(data.message || '注册失败')
    }
  } catch (error) {
    console.error('注册错误:', error)
    ElMessage.error('注册过程中发生错误')
  }
}

// 倒计时功能
function startCountdown() {
  countdown.value = 60

  if (countdownTimer) {
    clearInterval(countdownTimer)
  }

  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
    }
  }, 1000)
}
</script>

<style scoped>
/* 主要内容区域 */
.section {
  min-height: 100vh; /* 修改为100vh确保占满整个视口 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.fp-tablecell {
  width: 100%;
  display: flex; /* 改为flex布局 */
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
}

/* 表单容器 */
.register-box {
  max-width: 400px;
  width: 100%; /* 添加宽度100%确保在小屏幕下正确显示 */
  margin: 0 auto;
  padding: 30px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}

.register-box h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 28px;
  font-weight: normal;
}

/* 输入框容器 */
.textbox {
  position: relative;
  margin-bottom: 25px;
}

.textbox i {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #777;
  z-index: 1;
}

.textbox input,
.textbox select {
  width: 100%;
  padding: 12px 20px 12px 45px;
  border: 1px solid #ddd;
  border-radius: 25px;
  outline: none;
  transition: all 0.3s ease;
  font-size: 14px;
  box-sizing: border-box;
}

.textbox input:focus,
.textbox select:focus {
  border-color: #ff69b4;
  box-shadow: 0 0 8px rgba(255, 105, 180, 0.5);
}

/* 按钮样式 */
.btna {
  width: 100%;
  padding: 12px;
  background: #ff69b4;
  border: none;
  border-radius: 25px;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 1s ease;
  font-weight: bold;
  letter-spacing: 1px;
}

.btna:hover {
  background:#ff8ec7;
  transform: translateY(-2px);
  transition: all 1s ease;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.btna:active {
  transform: translateY(0);
}

/* 链接样式 */
.login-link,
.back-to-login {
  text-align: center;
  margin-top: 20px;
}

.login-link a,
.back-to-login a {
  color: #ff69b4;
  text-decoration: none;
  margin: 0 5px;
  font-size: 14px;
}

.login-link a:hover,
.back-to-login a:hover {
  text-decoration: underline;
}

/* 选项卡内容 */
.tab-content {
  display: none;
  animation: fadeEffect 0.5s;
}

.tab-content.active {
  display: block;
}

/* 步骤内容 */
.step {
  display: none;
}

.step.active {
  display: block;
}

/* 动画效果 */
@keyframes fadeEffect {
  from {opacity: 0;}
  to {opacity: 1;}
}

/* 响应式设计 */
@media (max-width: 480px) {
  .register-box {
    padding: 20px 15px;
    margin: 10px;
  }

  .register-box h1 {
    font-size: 24px;
  }

  .textbox input,
  .textbox select {
    padding: 10px 15px 10px 40px;
  }

  .verification-code {
    flex-direction: column;
  }

  .verification-code input {
    padding-right: 12px;
  }

  .verification-code button {
    position: relative;
    right: auto;
    top: auto;
    transform: none;
    width: 100%;
    padding: 10px;
    margin-top: 10px;
  }
}

/* 验证码区域 */
.verification-code {
  position: relative;
  display: flex;
  gap: 10px;
}

.verification-code input {
  flex: 1;
  padding-right: 120px; /* 为按钮留出空间 */
}

.verification-code button {
  position: absolute;
  right: 5px;
  top: 50%;
  background: #ff69b4;
  transform: translateY(-50%);
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 12px;
  transition: all 0.3s ease;
  min-width: 100px;
  text-align: center;
}

.verification-code button:hover {
  background: #ff8ec7;
  transform: translateY(-55%);
}

.verification-code button:disabled {
  background: #ccc;
  transform: translateY(-50%);
}

.verification-code button:disabled:hover {
  background: #ccc;
  transform: translateY(-55%);
}

#content-containers {
  text-align: center;
  padding: 40px;
  width: 100%;
  position: relative;
  z-index: 1;
}
</style>
