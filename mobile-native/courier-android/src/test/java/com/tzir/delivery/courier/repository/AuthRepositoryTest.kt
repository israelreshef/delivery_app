package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.model.AuthResponse
import com.tzir.delivery.courier.model.LoginRequest
import com.tzir.delivery.courier.model.RegisterRequest
import com.tzir.delivery.courier.model.User
import com.tzir.delivery.courier.model.UserRole
import com.tzir.delivery.courier.network.DeliveryApi
import com.tzir.delivery.courier.network.TokenManager
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.mockkObject
import io.mockk.runs
import io.mockk.unmockkAll
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class AuthRepositoryTest {

    private val mockApi = mockk<DeliveryApi>()
    private lateinit var repository: AuthRepository
    private val testDispatcher = StandardTestDispatcher()

    private val mockUser = User(
        id = "42",
        username = "test_courier",
        email = "test@example.com",
        phoneNumber = "050-1234567",
        role = UserRole.COURIER,
        courierId = "1",
        fullName = "Test Courier"
    )

    @Before
    fun setUp() {
        mockkObject(TokenManager)
        every { TokenManager.sessionInvalidated } returns false
        every { TokenManager.token } returns null
        every { TokenManager.token = any() } just runs
        repository = AuthRepository(mockApi)
    }

    @After
    fun tearDown() {
        unmockkAll()
    }

    @Test
    fun `login success saves tokens and updates currentUser`() = runTest(testDispatcher) {
        val authResponse = AuthResponse(
            success = true,
            accessToken = "eyJ.access_token",
            refreshToken = "eyJ.refresh_token",
            user = mockUser
        )
        coEvery { mockApi.login(any()) } returns authResponse

        val result = repository.login("test_courier", "password123")

        assertTrue(result.success)
        assertEquals("test_courier", result.user?.username)
        coVerify { mockApi.login(LoginRequest(username = "test_courier", password = "password123")) }
        verify { TokenManager.token = "eyJ.access_token" }
        verify { TokenManager.saveRefreshToken("eyJ.refresh_token") }
    }

    @Test
    fun `login failure does not update tokens`() = runTest(testDispatcher) {
        val errorResponse = AuthResponse(
            success = false,
            error = "Invalid credentials"
        )
        coEvery { mockApi.login(any()) } returns errorResponse

        val result = repository.login("test_courier", "wrong_password")

        assertEquals(false, result.success)
        verify(exactly = 0) { TokenManager.token = any() }
        verify(exactly = 0) { TokenManager.saveRefreshToken(any()) }
    }

    @Test
    fun `logout clears user and token`() = runTest(testDispatcher) {
        coEvery { mockApi.login(any()) } returns AuthResponse(
            success = true,
            accessToken = "tok",
            user = mockUser
        )
        repository.login("test_courier", "password123")
        repository.logout()

        assertNull(repository.currentUser.value)
        verify { TokenManager.token = null }
    }

    @Test
    fun `login with username sets correct request`() = runTest(testDispatcher) {
        val authResponse = AuthResponse(success = true, accessToken = "tok", user = mockUser)
        coEvery { mockApi.login(any()) } returns authResponse

        repository.login("my_username", "pass")

        coVerify {
            mockApi.login(withArg { req ->
                assert(req.username == "my_username")
                assert(req.password == "pass")
            })
        }
    }

    @Test
    fun `init with sessionInvalidated clears currentUser`() {
        every { TokenManager.sessionInvalidated } returns true

        val repo = AuthRepository(mockApi)

        assertNull(repo.currentUser.value)
    }

    @Test
    fun `register delegates to api`() = runTest(testDispatcher) {
        val registerReq = RegisterRequest(
            username = "new_user",
            email = "new@test.com",
            password = "StrongPass1!",
            phone = "050-0000000",
            userType = UserRole.COURIER,
            fullName = "New User"
        )
        val response = AuthResponse(success = true, accessToken = "tok", user = mockUser)
        coEvery { mockApi.register(any()) } returns response

        val result = repository.register(registerReq)

        assertTrue(result.success)
        coVerify { mockApi.register(registerReq) }
    }

    @Test
    fun `register failure returns error`() = runTest(testDispatcher) {
        val registerReq = RegisterRequest(
            username = "new_user",
            email = "new@test.com",
            password = "weak",
            phone = "050-0000000",
            userType = UserRole.COURIER,
            fullName = "New User"
        )
        val response = AuthResponse(success = false, error = "Weak password")
        coEvery { mockApi.register(any()) } returns response

        val result = repository.register(registerReq)

        assertEquals(false, result.success)
        assertNotNull(result.error)
    }
}
