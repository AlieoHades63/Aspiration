function SetupLogin() {
  SaveManager.SetCurrentUser(null);

  const LoginButton = document.getElementById("LoginButton");
  const ToSignupButton = document.getElementById("ToSignupButton");
  const ErrorLabel = document.getElementById("ErrorLabel");

  LoginButton.addEventListener("click", () => {
    const Username = document.getElementById("UsernameInput").value.trim();
    const Password = document.getElementById("PasswordInput").value.trim();
    const Users = LoadUsers();

    if (Users[Username]?.Password === Password) {
      SaveManager.SetCurrentUser(Username);
      SaveManager.EnsureUser(Username);
      window.location.href =
        Users[Username].AccountType === "Child"
          ? "../Files_HTML/Child-Home.html"
          : "../Files_HTML/Adult-Home.html";
    } else {
      ErrorLabel.textContent = "Invalid username or password.";
    }
  });

  ToSignupButton.addEventListener("click", () => {
    window.location.href = "../Files_HTML/Auth-SignUp.html";
  });
}

function SetupSignup() {
  SaveManager.SetCurrentUser(null); // Clear current user

  const SignupButton = document.getElementById("SignupButton");
  const ToLoginButton = document.getElementById("ToLoginButton");
  const ErrorLabel = document.getElementById("ErrorLabel");

  SignupButton.addEventListener("click", e => {
    e.preventDefault();

    const Username = document.getElementById("NewUsernameInput").value.trim();
    const Password = document.getElementById("NewPasswordInput").value.trim();
    const AccountType = document.querySelector('input[name="AccountType"]:checked')?.value;

    if (!Username || !Password || !AccountType) {
      ErrorLabel.textContent = "Please fill out all fields and select an account type.";
      return;
    }
    if (Password.length < 8) {
      ErrorLabel.textContent = "Password must be at least 8 characters.";
      return;
    }

    const Users = LoadUsers();
    if (Users[Username]) {
      ErrorLabel.textContent = "Username already exists.";
      return;
    }

    Users[Username] = { Password, AccountType };
    SaveUsers(Users);
    SaveManager.SetCurrentUser(Username);
    SaveManager.EnsureUser(Username);

    window.location.href =
      AccountType === "Child"
        ? "../Files_HTML/Child-Home.html"
        : "../Files_HTML/Adult-Home.html";
  });

  ToLoginButton.addEventListener("click", () => {
    window.location.href = "../index.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const ResetButton = document.getElementById("ResetButton");
  if (ResetButton) {
    ResetButton.addEventListener("click", () => {
      localStorage.removeItem("Users");
      localStorage.removeItem("GameData");
      SaveManager.SetCurrentUser(null);
      location.reload();
    });
  }
});

function LoadUsers() {
  try {
    return JSON.parse(localStorage.getItem("Users")) || {};
  } catch {
    return {};
  }
}

function SaveUsers(users) {
  localStorage.setItem("Users", JSON.stringify(users));
}