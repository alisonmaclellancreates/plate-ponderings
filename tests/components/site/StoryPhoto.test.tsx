import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  PHOTO_EXPIRED_MESSAGE,
  StoryPhotoThumbnail,
  StoryPhotoZoom,
} from "@/components/site/StoryPhoto";

const props = {
  photo: "https://signed.example/photo.jpg",
  box: { x: 0.4, y: 0.45, w: 0.2, h: 0.1 },
  handle: "Traveler4821",
  meaning: "They might be a road tripper",
};

const open = async () => {
  const user = userEvent.setup();
  const trigger = screen.getByRole("button", { name: "View full photo shared by Traveler4821" });
  await user.click(trigger);
  return { user, trigger };
};

describe("StoryPhotoZoom", () => {
  it("zooms the same lazy image to the plate area and re-crops at its real size", () => {
    render(<StoryPhotoZoom {...props} />);
    const img = screen.getByRole("img", { name: "Photo shared by Traveler4821" });
    expect(img).toHaveAttribute("src", props.photo);
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("width", "944");
    const before = img.style.cssText;
    Object.defineProperty(img, "naturalWidth", { value: 1600 });
    Object.defineProperty(img, "naturalHeight", { value: 800 });
    fireEvent.load(img);
    expect(img).toHaveAttribute("width", "1600");
    expect(img.style.cssText).not.toBe(before);
  });

  it("opens the whole photo with the meaning and handle, and closes with Close photo", async () => {
    render(<StoryPhotoZoom {...props} />);
    const { user, trigger } = await open();
    const dialog = screen.getByRole("dialog", { name: props.meaning });
    expect(screen.getByText("Photo shared by Traveler4821")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Full photo shared by Traveler4821" })).toHaveAttribute(
      "src",
      props.photo,
    );
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.click(screen.getByRole("button", { name: "Close photo" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes with Esc and returns focus to the plate view", async () => {
    render(<StoryPhotoZoom {...props} />);
    const { user, trigger } = await open();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes with a tap outside", async () => {
    render(<StoryPhotoZoom {...props} />);
    await open();
    await new Promise((r) => setTimeout(r, 0));
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("shows the reload message instead of a broken image when the link has expired", async () => {
    render(<StoryPhotoZoom {...props} />);
    const { user } = await open();
    fireEvent.error(screen.getByRole("img", { name: "Full photo shared by Traveler4821" }));
    expect(screen.getByRole("alert")).toHaveTextContent(PHOTO_EXPIRED_MESSAGE);
    expect(screen.queryByRole("img", { name: /Full photo/ })).toBeNull();
    await user.keyboard("{Escape}");
    await open();
    expect(screen.getByRole("img", { name: "Full photo shared by Traveler4821" })).toBeTruthy();
  });
});

describe("StoryPhotoThumbnail", () => {
  it("shows an older photo as before, with no button", () => {
    render(<StoryPhotoThumbnail photo={props.photo} handle="Traveler4821" />);
    expect(screen.getByRole("img", { name: "Photo shared by Traveler4821" })).toHaveAttribute(
      "loading",
      "lazy",
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});
