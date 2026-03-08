import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../components/LoginPage";
import { AuthContext } from "../context/AuthContext";

const mockLogin = vi.fn();

const renderLogin = () =>
  render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          user: null,
          loading: false,
          login: mockLogin,
          logout: vi.fn(),
        }}
      >
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

describe("LoginPage", () => {
  it("renders username and password fields", () => {
    renderLogin();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(
      document.querySelector('input[type="password"]'),
    ).toBeInTheDocument();
  });

  it("renders sign in button", () => {
    renderLogin();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("calls login with entered credentials", async () => {
    renderLogin();
    await userEvent.type(screen.getByRole("textbox"), "admin");
    await userEvent.type(
      document.querySelector('input[type="password"]')!,
      "password",
    );
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(mockLogin).toHaveBeenCalledWith("admin", "password");
  });
});
