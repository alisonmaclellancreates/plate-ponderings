import { act, render, screen } from "@testing-library/react";
import { useForm, type UseFormReturn } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@/components/ui/form";

type Values = { plate: string };
let formRef: UseFormReturn<Values> | undefined;

function Harness({ message }: { message?: string }) {
  const form = useForm<Values>({ defaultValues: { plate: "" } });
  formRef = form;
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="plate"
        render={({ field }) => (
          <FormItem className="item-x">
            <FormLabel>Plate</FormLabel>
            <FormControl>
              <input {...field} />
            </FormControl>
            <FormDescription>Letters only</FormDescription>
            <FormMessage>{message}</FormMessage>
          </FormItem>
        )}
      />
    </Form>
  );
}

afterEach(() => {
  formRef = undefined;
});

describe("Form", () => {
  it("wires ids and shows children when there is no error", () => {
    render(<Harness message="Hint" />);
    const input = screen.getByLabelText("Plate");
    const desc = screen.getByText("Letters only");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input.getAttribute("aria-describedby")).toBe(desc.id);
    expect(desc.id).toMatch(/-form-item-description$/);
    expect(screen.getByText("Hint")).toHaveClass("text-destructive");
    expect(screen.getByText("Plate")).not.toHaveClass("text-destructive");
  });

  it("renders no message when there is no error and no children", () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('[id$="-form-item-message"]')).toBeNull();
  });

  it("shows the error and marks the control invalid", () => {
    render(<Harness message="Hint" />);
    act(() => formRef!.setError("plate", { message: "Too long" }));
    const input = screen.getByLabelText("Plate");
    const msg = screen.getByText("Too long");
    expect(screen.queryByText("Hint")).toBeNull();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toBe(
      `${screen.getByText("Letters only").id} ${msg.id}`,
    );
    expect(screen.getByText("Plate")).toHaveClass("text-destructive");
  });

  it("renders nothing for an error with an empty message", () => {
    const { container } = render(<Harness message="Hint" />);
    act(() => formRef!.setError("plate", { type: "x" }));
    expect(screen.queryByText("Hint")).toBeNull();
    expect(container.querySelector('[id$="-form-item-message"]')).toBeNull();
  });

  it("throws outside FormField and outside FormItem", () => {
    function Bare() {
      useFormField();
      return null;
    }
    function Outer({ inField }: { inField: boolean }) {
      const form = useForm<Values>();
      return (
        <Form {...form}>
          {inField ? (
            <FormField control={form.control} name="plate" render={() => <Bare />} />
          ) : (
            <Bare />
          )}
        </Form>
      );
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => render(<Outer inField={false} />)).toThrow(
        "useFormField should be used within <FormField>",
      );
      expect(() => render(<Outer inField />)).toThrow(
        "useFormField should be used within <FormItem>",
      );
    } finally {
      spy.mockRestore();
    }
  });
});
