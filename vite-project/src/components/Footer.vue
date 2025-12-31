<template>
  <footer class="footer wow fadeInUp" id="contact">
    <div class="footer-top">
      <div class="container">
        <!-- <div class="layui-row">
          <div class="layui-col-xs12 layui-col-sm6 layui-col-md4">
            <div class="single-widget about">
              <div class="footer-logo">
                <h2>Miku</h2>
              </div>
              <p>音乐与梦想的使者。</p>
              <div class="button">
                <a href="#" class="btn layui-btn layui-btn-normal">关于我</a>
              </div>
            </div>
          </div>
          <div class="layui-col-xs12 layui-col-sm6 layui-col-md4">
            <div class="single-widget">
              <h2>相关链接</h2>
              <ul class="social-icon">
                <li class="active"><a href="#"><i class="fas fa-book"></i>博文</a></li>
                <li class="active"><a href="#"><i class="far fa-comments"></i>留言</a></li>
                <li class="active"><a href="#"><i class="fas fa-share"></i>资源</a></li>
                <li class="active"><a href="#"><i class="far fa-snowflake"></i>日记</a></li>
                <li class="active"><a href="#"><i class="far fa-file"></i>归档</a></li>
              </ul>
            </div>
          </div>
          <div class="layui-col-xs12 layui-col-sm12 layui-col-md4">
            <div class="single-widget contact">
              <h2>联系我</h2>
              <ul class="list">
                <li><i class="fas fa-map-marker-alt"></i>地址:-------------------</li>
                <li><i class="fab fa-qq"></i>QQ: 834888615</li>
                <li><i class="fas fa-envelope"></i>邮箱: 834888615@qq.com</li>
              </ul>
            </div>
          </div>
        </div> -->
        <div style="text-align: center; margin-top: 40px; font-size: 13px; color: #999;">
          &copy; 2025 穆清兮 | 个人博客 版权所有 黑ICP备2025040065号
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
// 这个组件相对简单，主要是静态内容
</script>

<style scoped>
/* 从原CSS中提取底部相关样式 */
.footer {
  position: relative;
  z-index: 5;
  width: 100%;
  flex-shrink: 0;
  margin-top: auto;
}

.footer .container {
  width: 90%;
  padding-right: 15px;
  padding-left: 15px;
  margin-right: auto;
  margin-left: auto;
}

.footer .footer-top {
  background: #232328;
  padding: 60px 0 90px;
}

.footer .single-widget {
  margin-top: 30px;
}

.footer .footer-logo {
  margin-bottom: 20px;
}

.footer .single-widget h2 {
  color: #fff;
  font-size: 18px;
  margin-bottom: 20px;
  text-transform: uppercase;
}

.footer .about p {
  color: #eee;
}

.footer .button .btn {
  margin-top: 20px;
}

.footer .button .btn:hover {
  border-color: #fff;
}

.footer .contact ul li {
  color: #eee;
  position: relative;
  padding-left: 40px;
  font-family: Roboto, sans-serif;
  margin-bottom: 10px;
}

.footer .contact ul li:last-child {
  margin: 0;
}

.footer .contact ul li i {
  position: absolute;
  top: 50%;
  width: 30px;
  height: 30px;
  text-align: center;
  line-height: 30px;
  left: 0;
  margin-top: -15px;
  font-size: 16px;
  color: #eee;
}

.footer .contact ul li a {
  color: #fff;
}

.footer .social-icon li {
  float: left;
  width: 50%;
  margin-bottom: 10px;
}

.footer .social-icon li:last-child {
  margin: 0;
}

.footer .social-icon li a {
  color: #eee;
  text-decoration: none;
}

.footer .social-icon li a:hover {
  color: #82B440;
}

.footer .social-icon li a i {
  margin-right: 10px;
  width: 20px;
  font-size: 16px;
}

.footer .copyright {
  padding: 12px 0;
  background: #1D1D21;
}

.footer .copyright .text-center {
  text-align: center;
}

.footer .copyright p {
  color: #bbb;
  font-size: 14px;
}

/* 响应式设计 */
@media screen and (max-width: 768px) {
  .layui-col-xs12 {
    width: 100%;
    margin-bottom: 30px;
  }

  .footer .single-widget {
    margin-bottom: 20px;
  }

  .footer .social-icon li {
    width: 100%;
  }
}
</style>