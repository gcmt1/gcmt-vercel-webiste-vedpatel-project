import { render, screen } from "@testing-library/react";
import { Field, Button } from "./components/ui";
test("form fields have programmatic labels and disabled actions are inert", () => {
  render(
    <>
      <Field label="Delivery PIN" />
      <Button disabled>Pay</Button>
    </>,
  );
  expect(screen.getByLabelText("Delivery PIN")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Pay" })).toBeDisabled();
});
