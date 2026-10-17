ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS photo_box real[];

ALTER TABLE public.stories ADD CONSTRAINT stories_photo_box_valid CHECK (
  photo_box IS NULL OR (
    array_ndims(photo_box) = 1
    AND cardinality(photo_box) = 4
    AND array_position(photo_box, NULL) IS NULL
    AND photo_box[1] >= 0 AND photo_box[2] >= 0
    AND photo_box[3] > 0 AND photo_box[4] > 0
    AND photo_box[1] + photo_box[3] <= 1
    AND photo_box[2] + photo_box[4] <= 1
  )
);

ALTER TABLE public.stories ADD CONSTRAINT stories_photo_box_needs_photo CHECK (
  photo_box IS NULL OR photo_path IS NOT NULL
);

COMMENT ON COLUMN public.stories.photo_box IS
  'Plate box as fractions of the processed photo: {x, y, width, height}. Server-written only; cleared with photo_path.';
