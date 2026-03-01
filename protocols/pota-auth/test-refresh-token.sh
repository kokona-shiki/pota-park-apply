#!/bin/bash

# POTA Refresh Token 测试脚本
# 从日志中提取的 refresh_token（可能已过期）

REFRESH_TOKEN="eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.Wv-9rOyv-E6vLcP0rUGkpG9HVxUQlmzZVilVIJYR4gmfXakIdPrGqYK0HKc06aANaIbb9iUPCD8hHTP6B6h_e5Hbg_gAIA1C9wSnCbM34st8s3yWMwrMFw9X8sVUZgE5OFEtTbEVtcuMOeuJV1FCTYWtZJ6fH-ZC1gsYKhxxSriVHr-gcTMmZhC1MCMK2Hbf7ymLDDP1ThmBPNracU97I33pIpXs_j-rn9Y18tqiOgO0YZEL5qGZf7h0AdcIqQ8p1FNXaKCgi71EXNPqgFeKdLDM7I8NbDx81w7CqRyl_Iay-n_q25OIHawaOOJTXI01vSk7QVFzoCd222ZypVAeTA.JMruW6eYo4ydG6mg._OpqN0Gjb-cL4cQp5uCzScwBNzyRjMlP8ZCIBGxy93gLKo_VdN68oZFrpLYPnrlEUrt-QVJTBdEPg_p1kTmU5buZBW0V_7vkPQLelpIkwYa2ge2yRaOEIRB5-xAOiFuHpoiWHP-ASW1RCQAJdWqLBcc3C1SNIJCn9tV5F3Bhdcx3MPto3Oi8zmw612A2heeI4U1lr0diwvXg9bLXxk7_88sy0WPH1zp4Z1G7QiYjJc3jJ6DAGoagjWBb4GnPI67whN5t60oWRJp49DT0-QZbi7Mvivlr1MDnMZsPic_cb8G6BBmelds7PhVBZHBm3WKsykLoBdKPy6ss1DSb8-XrOviugke6kPtcNXRws5tqlajIZ6zmAxab4LSYQOnFTgS493Ubx6PBEWt5ZLy4VR4VUqMDLXmoBH0RB5VNBATz3WofUjQJKJeqs1uVqLzl8z_vRnNsqnw3Rqivdv_wYFofQ768iUJPD_zkHoHM-X6bRW62LcJ1boTCwM8fJoE6ZGHq0w3vUZNtotB8Recai9hlReuEWPbYEdi_H18fWZz7x0oW35pjGFJD39F_grJiV5tBFocucqmMfixrmlt64AxdHmvc8lrjmOsNTRfu67MTylXxHfNs5HY0Q-rFvWhaRMDgwIGEPfwKpxYhCRTqjEHYZPmgK58R5WR2yZWkwMPViGhc1gzN1p8OK5zVHpkQdSsRcHtE96K0SxdDJnac_AkAMpnODzn-1r2-gfjHs_vmKgp5zrT9s9iSoap-vDdKNMGCGAn07cCRol4EuVJBALikjYSahasHXRpqIuHeo2Adz3xtOXkAW37DGukk9nWTBmlWCAZ90iQcIq0Ajig0vFoZbdOMV4MUYjuCtCcz9QozGqHTuyuRlenoRjsvN5eO_kHThyeAnKWKSbJBIgRppj8hM_6TPFT0KtQ4wyUT13QUvtFnX3U0If8yuYw-dPgzPauUqAqxzUE_TF8rZpWzKj4KPzHPBnGn6pMFj_HBL483oC2vSdWrJt2Ugjb--wxj-x4O3YhodyTDTwD6MD39tHq2mBy4MQhkXSmKgU2sDupMkRAmVf6zCArphuiuAIZHmZ2dko4wKZV3M_T0FWwk_ZD468xnEHED1jdRQMWJueqLuDbywfh28CvmT72dICke49Wn5_35aT4DJB8sJKzxO1tjMbexkGBeNsEU9Myba9B5Xi2qiPfaMndawL18iXu6e-I7gv1AoqoqwG6UO6x6sZF1se7r7n_wIVb_Tsx3QCGsEOutrApKUHMXJyRLHiQxsYFW6Ee0lc_5I4NAx1KoV8ooBW-p_rJkGvXEVtNllYZLBKQ34FcHPXDXpDpwTlsmMb-AZ8nzSeyjSX5vaSlLb--mpbLNNikwBpFk9fR9uF07mMRV6ydwHQFbPY7fPaX7LzI.K2JWMir7580HmYxw-h97ZA"

CLIENT_ID="7hluqct0n2nckib7i7sd5753oa"
TOKEN_ENDPOINT="https://parksontheair.auth.us-east-2.amazoncognito.com/oauth2/token"

echo "=========================================="
echo "POTA Refresh Token 测试"
echo "=========================================="
echo ""
echo "测试时间: $(date)"
echo "端点: $TOKEN_ENDPOINT"
echo "Client ID: $CLIENT_ID"
echo ""
echo "注意: 这个 refresh_token 是从之前的抓包日志中提取的，"
echo "      可能已经过期。如果测试失败，需要获取新的 refresh_token。"
echo ""
echo "=========================================="
echo ""

# 执行刷新请求
echo "发送刷新请求..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "client_id=$CLIENT_ID" \
  -d "refresh_token=$REFRESH_TOKEN")

# 分离响应体和状态码
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "HTTP 状态码: $HTTP_STATUS"
echo ""
echo "响应内容:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

# 分析结果
if [ "$HTTP_STATUS" = "200" ]; then
  echo "=========================================="
  echo "✅ 测试成功！Refresh Token 可用"
  echo "=========================================="
  echo ""
  
  # 检查响应中是否包含新的 token
  if echo "$BODY" | grep -q "id_token"; then
    echo "✅ 响应中包含新的 id_token"
  fi
  
  if echo "$BODY" | grep -q "access_token"; then
    echo "✅ 响应中包含新的 access_token"
  fi
  
  # 检查是否有新的 refresh_token（token rotation）
  if echo "$BODY" | grep -q "refresh_token"; then
    NEW_REFRESH_TOKEN=$(echo "$BODY" | jq -r '.refresh_token' 2>/dev/null)
    if [ "$NEW_REFRESH_TOKEN" != "$REFRESH_TOKEN" ] && [ "$NEW_REFRESH_TOKEN" != "null" ]; then
      echo "✅ 检测到 Token Rotation：返回了新的 refresh_token"
      echo "   这意味着旧的 refresh_token 已经失效"
    else
      echo "ℹ️  返回了相同的 refresh_token（未启用 Token Rotation）"
    fi
  fi
  
  # 提取 expires_in
  EXPIRES_IN=$(echo "$BODY" | jq -r '.expires_in' 2>/dev/null)
  if [ "$EXPIRES_IN" != "null" ] && [ -n "$EXPIRES_IN" ]; then
    echo "✅ Token 有效期: $EXPIRES_IN 秒 ($(($EXPIRES_IN / 60)) 分钟)"
  fi
  
elif [ "$HTTP_STATUS" = "400" ]; then
  ERROR=$(echo "$BODY" | jq -r '.error' 2>/dev/null || echo "未知错误")
  ERROR_DESC=$(echo "$BODY" | jq -r '.error_description' 2>/dev/null || echo "")
  
  echo "=========================================="
  echo "❌ 测试失败：HTTP 400 Bad Request"
  echo "=========================================="
  echo ""
  echo "错误类型: $ERROR"
  if [ -n "$ERROR_DESC" ] && [ "$ERROR_DESC" != "null" ]; then
    echo "错误描述: $ERROR_DESC"
  fi
  echo ""
  
  case "$ERROR" in
    "invalid_grant")
      echo "可能的原因："
      echo "  - Refresh token 已过期"
      echo "  - Refresh token 无效"
      echo "  - Refresh token 已被使用（如果启用了 rotation）"
      ;;
    "invalid_token")
      echo "可能的原因："
      echo "  - Refresh token 格式错误"
      echo "  - Refresh token 已损坏"
      ;;
    *)
      echo "请查看错误描述获取更多信息"
      ;;
  esac
  
elif [ "$HTTP_STATUS" = "401" ]; then
  echo "=========================================="
  echo "❌ 测试失败：HTTP 401 Unauthorized"
  echo "=========================================="
  echo ""
  echo "可能的原因："
  echo "  - Client ID 不正确"
  echo "  - 需要额外的认证信息"
  
else
  echo "=========================================="
  echo "❌ 测试失败：HTTP $HTTP_STATUS"
  echo "=========================================="
  echo ""
  echo "请查看响应内容获取更多信息"
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
