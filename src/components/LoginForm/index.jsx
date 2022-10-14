import { useState } from "react";
import FirebaseAuthService from "../../FirebaseAuthService";

const LoginForm = ({ existingUser }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await FirebaseAuthService.loginUser(username, password);
      setUsername("");
      setPassword("");
    } catch (error) {
      alert(error.message);
    }
  }
  function handleLogout() {
    FirebaseAuthService.logoutUser();
  }
  async function handleSendResetPasswordEmail() {
    if (!username) {
      alert("Missing username!");
    }
    try {
      await FirebaseAuthService.sendPasswordResetEmail(username);
      alert("We have sent the password reset");
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="login-form-container">
      {existingUser ? (
        <div className="row">
          <h3>Welcome, {existingUser.email}</h3>
          <button
            type="button"
            className="primary-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="login-form">
          <label className="input-label login-label">
            Username (email):
            <input
              type="email"
              required
              value={username}
              onChange={e => {
                setUsername(e.target.value);
              }}
            />
          </label>
          <label className="input-label login-label">
            Password:
            <input
              type="password"
              required
              value={password}
              onChange={e => {
                setPassword(e.target.value);
              }}
            />
          </label>
          <div className="button-box">
            <button className="primary-button">Login</button>
            <button
              type="button"
              onClick={handleSendResetPasswordEmail}
              className="primary-button"
            >
              Reset Password
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default LoginForm;
