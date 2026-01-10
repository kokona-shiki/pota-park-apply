#!/bin/bash

# POTA Token Rotation 测试脚本
# 测试使用同一个 refresh_token 刷新两次会发生什么

REFRESH_TOKEN="eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.Wv-9rOyv-E6vLcP0rUGkpG9HVxUQlmzZVilVIJYR4gmfXakIdPrGqYK0HKc06aANaIbb9iUPCD8hHTP6B6h_e5Hbg_gAIA1C9wSnCbM34st8s3yWMwrMFw9X8sVUZgE5OFEtTbEVtcuMOeuJV1FCTYWtZJ6fH-ZC1gsYKhxxSriVHr-gcTMmZhC1MCMK2Hbf7ymLDDP1ThmBPNracU97I33pIpXs_j-rn9Y18tqiOgO0YZEL5qGZf7h0AdcIqQ8p1FNXaKCgi71EXNPqgFeKdLDM7I8NbDx81w7CqRyl_Iay-n_q25OIHawaOOJTXI01vSk7QVFzoCd222ZypVAeTA.JMruW6eYo4ydG6mg._OpqN0Gjb-cL4cQp5uCzScwBNzyRjMlP8ZCIBGxy93gLKo_VdN68oZFrpLYPnrlEUrt-QVJTBdEPg_p1kTmU5buZBW0V_7vkPQLelpIkwYa2ge2yRaOEIRB5-xAOiFuHpoiWHP-ASW1RCQAJdWqLBcc3C1SNIJCn9tV5F3Bhdcx3MPto3Oi8zmw612A2heeI4U1lr0diwvXg9bLXxk7_88sy0WPH1zp4Z1G7QiYjJc3jJ6DAGoagjWBb4GnPI67whN5t60oWRJp49DT0-QZbi7Mvivlr1MDnMZsPic_cb8G6BBmelds7PhVBZHBm3WKsykLoBdKPy6ss1DSb8-XrOviugke6kPtcNXRws5tqlajIZ6zmAxab4LSYQOnFTgS493Ubx6PBEWt5ZLy4VR4VUqMDLXmoBH0RB5VNBATz3WofUjQJKJeqs1uVqLzl8z_vRnNsqnw3Rqivdv_wYFofQ768iUJPD_zkHoHM-X6bRW62LcJ1boTCwM8fJoE6ZGHq0w3vUZNtotB8Recai9hlReuEWPbYEdi_H18fWZz7x0oW35pjGFJD39F_grJiV5tBFocucqmMfixrmlt64AxdHmvc8lrjmOsNTRfu67MTylXxHfNs5HY0Q-rFvWhaRMDgwIGEPfwKpxYhCRTqjEHYZPmgK58R5WR2yZWkwMPViGhc1gzN1p8OK5zVHpkQdSsRcHtE96K0SxdDJnac_AkAMpnODzn-1r2-gfjHs_vmKgp5zrT9s9iSoap-vDdKNMGCGAn07cCRol4EuVJBALikjYSahasHXRpqIuHeo2Adz3xtOXkAW37DGukk9nWTBmlWCAZ90iQcIq0Ajig0vFoZbdOMV4MUYjuCtCcz9QozGqHTuyuRlenoRjsvN5eO_kHThyeAnKWKSbJBIgRppj8hM_6TPFT0KtQ4wyUT13QUvtFnX3U0If8yuYw-dPgzPauUqAqxzUE_TF8rZpWzKj4KPzHPBnGn6pMFj_HBL483oC2vSdWrJt2Ugjb--wxj-x4O3YhodyTDTwD6MD39tHq2mBy4MQhkXSmKgU2sDupMkRAmVf6zCArphuiuAIZHmZ2dko4wKZV3M_T0FWwk_ZD468xnEHED1jdRQMWJueqLuDbywfh28CvmT72dICke49Wn5_35aT4DJB8sJKzxO1tjMbexkGBeNsEU9Myba9B5Xi2qiPfaMndawL18iXu6e-I7gv1AoqoqwG6UO6x6sZF1se7r7n_wIVb_Tsx3QCGsEOutrApKUHMXJyRLHiQxsYFW6Ee0lc_5I4NAx1KoV8ooBW-p_rJkGvXEVtNllYZLBKQ34FcHPXDXpDpwTlsmMb-AZ8nzSeyjSX5vaSlLb--mpbLNNikwBpFk9fR9uF07mMRV6ydwHQFbPY7fPaX7LzI.K2JWMir7580HmYxw-h97ZA"

CLIENT_ID="7hluqct0n2nckib7i7sd5753oa"
TOKEN_ENDPOINT="https://parksontheair.auth.us-east-2.amazoncognito.com/oauth2/token"

echo "=========================================="
echo "POTA Token Rotation 测试"
echo "=========================================="
echo ""
echo "测试：使用同一个 refresh_token 刷新两次"
echo "目的：检查是否启用了 Token Rotation"
echo ""

# 第一次刷新
echo "----------------------------------------"
echo "第一次刷新"
echo "----------------------------------------"
RESPONSE1=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "client_id=$CLIENT_ID" \
  -d "refresh_token=$REFRESH_TOKEN")

HTTP_STATUS1=$(echo "$RESPONSE1" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY1=$(echo "$RESPONSE1" | sed '/HTTP_STATUS:/d')

echo "HTTP 状态码: $HTTP_STATUS1"
if [ "$HTTP_STATUS1" = "200" ]; then
  echo "✅ 第一次刷新成功"
  NEW_REFRESH_TOKEN1=$(echo "$BODY1" | jq -r '.refresh_token' 2>/dev/null)
  if [ -n "$NEW_REFRESH_TOKEN1" ] && [ "$NEW_REFRESH_TOKEN1" != "null" ]; then
    echo "✅ 返回了新的 refresh_token"
    echo "   长度: ${#NEW_REFRESH_TOKEN1} 字符"
  else
    echo "ℹ️  响应中未包含 refresh_token（这是正常的，如果未启用 rotation）"
  fi
else
  echo "❌ 第一次刷新失败"
  echo "$BODY1" | jq . 2>/dev/null || echo "$BODY1"
  exit 1
fi

echo ""
sleep 2

# 第二次刷新（使用原始的 refresh_token）
echo "----------------------------------------"
echo "第二次刷新（使用原始的 refresh_token）"
echo "----------------------------------------"
RESPONSE2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "client_id=$CLIENT_ID" \
  -d "refresh_token=$REFRESH_TOKEN")

HTTP_STATUS2=$(echo "$RESPONSE2" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY2=$(echo "$RESPONSE2" | sed '/HTTP_STATUS:/d')

echo "HTTP 状态码: $HTTP_STATUS2"
if [ "$HTTP_STATUS2" = "200" ]; then
  echo "✅ 第二次刷新成功"
  echo ""
  echo "结论: 未启用 Token Rotation"
  echo "     同一个 refresh_token 可以多次使用"
elif [ "$HTTP_STATUS2" = "400" ]; then
  ERROR=$(echo "$BODY2" | jq -r '.error' 2>/dev/null)
  ERROR_DESC=$(echo "$BODY2" | jq -r '.error_description' 2>/dev/null)
  
  echo "❌ 第二次刷新失败"
  echo "错误: $ERROR"
  if [ -n "$ERROR_DESC" ] && [ "$ERROR_DESC" != "null" ]; then
    echo "描述: $ERROR_DESC"
  fi
  echo ""
  
  if [ "$ERROR" = "invalid_grant" ]; then
    echo "结论: ✅ 启用了 Token Rotation"
    echo "     第一次刷新后，旧的 refresh_token 已失效"
    echo "     必须使用新的 refresh_token 才能继续刷新"
  fi
else
  echo "❌ 第二次刷新失败（意外状态码）"
  echo "$BODY2" | jq . 2>/dev/null || echo "$BODY2"
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
