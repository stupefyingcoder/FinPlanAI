// src/views/auth.routes.js
import express from "express"
import cors from "cors"
import { signupSchema, loginSchema } from "../utils/validators.js"
import { setRefreshCookie, clearRefreshCookie } from "../utils/cookies.util.js"
import { signupPresenter, loginPresenter, refreshPresenter, logoutPresenter } from "../presenters/auth.presenter.js"

const router = express.Router()

const REFRESH_MAX_AGE_MS = 7 * 24 * 3600 * 1000

// Add CORS middleware for /signup endpoint
router.options("/signup", cors())
router.post("/signup", cors(), async (req, res, next) => {
  try {
    console.log("Signup request body:", req.body)

    // Normalize the request body to use 'name'
    const normalizedBody = {
      ...req.body,
      name: req.body.name || req.body.fullName
    }

    // Validate normalized data
    const validated = await signupSchema.validateAsync(normalizedBody)
    console.log("Validated data:", validated) // Debug validated data
    
    // Pass validated data to presenter
    const result = await signupPresenter(validated)
    
    if (result.error) {
      console.error("Signup error:", result.error) // Debug presenter errors
      return res.status(400).json({ 
        error: result.error,
        details: "Signup validation failed" // More descriptive error
      })
    }

    return res.status(201).json({
      message: "Signup successful",
      user: result.user
    })

  } catch (err) {
    // Handle validation errors with more detail
    if (err.isJoi) {
      console.error("Validation error:", err.details) // Debug validation errors
      return res.status(400).json({
        error: err.details[0].message,
        details: err.details
      })
    }
    
    // Log unexpected errors
    console.error("Signup unexpected error:", err)
    next(err)
  }
})

router.post("/login", async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body)
    if (error) return res.status(400).json({ error: error.details[0].message })

    const { accessToken, refreshToken, profileCompleted, fullName } = await loginPresenter(value)
    setRefreshCookie(res, refreshToken, REFRESH_MAX_AGE_MS)
    res.json({ accessToken, profileCompleted, fullName })
  } catch (err) {
    next(err)
  }
})

router.post("/refresh", async (req, res, next) => {
  try {
    const cookie = req.cookies?.refresh_token
    const result = await refreshPresenter(cookie)
    // rotate cookie
    setRefreshCookie(res, result.newRefreshToken, REFRESH_MAX_AGE_MS)
    res.json({ accessToken: result.accessToken })
  } catch (err) {
    next(err)
  }
})

router.post("/logout", async (req, res, next) => {
  try {
    const cookie = req.cookies?.refresh_token
    await logoutPresenter(cookie)
    clearRefreshCookie(res)
    res.json({ message: "Logged out" })
  } catch (err) {
    next(err)
  }
})

export default router
