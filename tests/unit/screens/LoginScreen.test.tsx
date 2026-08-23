import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LoginScreen } from "../../../src/screens/LoginScreen";

// 参照: docs/spec.md 4章（ログイン画面）、7.1節

describe("LoginScreen", () => {
  it("ログインボタンを押すとonLoginが呼ばれる", () => {
    const onLogin = vi.fn();
    render(<LoginScreen onLogin={onLogin} errorMessage={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Googleでログイン" }));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it("errorMessageが渡されるとエラーメッセージが表示される", () => {
    render(<LoginScreen onLogin={vi.fn()} errorMessage="ログインに失敗しました" />);
    expect(screen.getByText("ログインに失敗しました")).toBeInTheDocument();
  });
});
