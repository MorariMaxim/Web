
CREATE OR REPLACE FUNCTION get_comment_tree(comment_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    comment JSONB;
BEGIN
    
    SELECT jsonb_build_object(
        'author', c.author,
        'comment', c.text,
        'children', (
            SELECT COALESCE(jsonb_agg(get_comment_tree(child_id)), '[]'::jsonb)
            FROM comment_hierarchy ch
            JOIN comments c ON ch.child_id = c.id
            WHERE ch.parent_id = comment_id
        )
    )
    INTO comment
    FROM comments c
    WHERE c.id = comment_id;

    
    IF NOT FOUND THEN
        RETURN NULL; 
    END IF;

    
    IF comment IS NULL THEN
        RETURN jsonb_build_object('author', (SELECT author FROM comments WHERE id = comment_id),
                                   'comment', (SELECT text FROM comments WHERE id = comment_id),
                                   'children', '[]'::jsonb);
    END IF;

    RETURN comment;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION get_image_comments(p_image_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    comments JSONB;
BEGIN
    
    SELECT jsonb_agg(get_comment_tree(id))
    INTO comments
    FROM comment_roots
    WHERE image_id = p_image_id;

    RETURN comments;
END;
$$ LANGUAGE plpgsql; 
 


CREATE OR REPLACE FUNCTION create_comment(comment_json jsonb) RETURNS INTEGER AS $$
DECLARE
    parent_id INTEGER;
    comment_id INTEGER;
BEGIN
    
    INSERT INTO comments (author, text)
    VALUES (comment_json->>'author', comment_json->>'comment')
    RETURNING id INTO comment_id;

    
    INSERT INTO comment_hierarchy (parent_id, child_id)
    SELECT comment_id, create_comment(child_comment)
    FROM jsonb_array_elements(comment_json->'children') AS child_comment;

    RETURN comment_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_comment_root(comment_json JSONB, user_image INTEGER)
RETURNS INTEGER AS $$
DECLARE
    comment_id INTEGER;
BEGIN
    
    SELECT create_comment(comment_json) INTO comment_id;

    
    INSERT INTO comment_roots (id, image_id)
    VALUES (comment_id, user_image);

    
    RETURN comment_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_comment_roots(comment_array JSONB, image_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    comment JSONB;
    comment_count INTEGER := 0;
BEGIN
    FOR comment IN SELECT jsonb_array_elements(comment_array)
    LOOP
        PERFORM create_comment_root(comment, image_id);
        comment_count := comment_count + 1;
    END LOOP;

    RETURN comment_count;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION insert_image(image_type TEXT, image_ext TEXT)
RETURNS INTEGER AS $$
DECLARE
    image_id INTEGER;
BEGIN
    
    INSERT INTO images (type, ext)
    VALUES (image_type, image_ext)
    RETURNING id INTO image_id;

    
    RETURN image_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION store_imgur_meta_data(image_id INTEGER, meta JSONB)
RETURNS INTEGER AS $$
DECLARE
    views INTEGER;
    ups INTEGER;
    downs INTEGER;
    title TEXT;
    description_ TEXT;
    tag TEXT;
BEGIN  
    views := (meta->>'views')::INTEGER;
    ups := (meta->>'ups')::INTEGER;
    downs := (meta->>'downs')::INTEGER;
    title := meta->>'title';
    description_ := meta->>'description';

     Insert into imgurMeta table
    INSERT INTO imgurMeta (image_id, views, ups, downs)
    VALUES (image_id, views, ups, downs);

     Insert into titles table
    IF title is not null then 
        INSERT INTO titles (image_id, "text")
        VALUES (image_id, title);
    end if;

     Insert into descriptions table only if description is not null
    IF description_ IS NOT NULL THEN
        INSERT INTO descriptions (image_id, "text")
        VALUES (image_id, description_);
    END IF;

     Loop through tags array and insert each tag
    FOR tag IN SELECT jsonb_array_elements_text(meta->'tags')
    LOOP
        INSERT INTO tags (image_id, "name")
        VALUES (image_id, tag);
    END LOOP;

    RETURN image_id;
END;
$$ LANGUAGE plpgsql;




CREATE OR REPLACE FUNCTION get_imgur_meta_data(image_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    meta JSONB;
    v_views INTEGER;
    v_ups INTEGER;
    v_downs INTEGER;
    v_title TEXT;
    v_description TEXT;
    v_tags TEXT[];
BEGIN 
    SELECT im.views, im.ups, im.downs
    INTO v_views, v_ups, v_downs
    FROM imgurMeta im
    WHERE im.image_id = $1;
 
    SELECT t."text"
    INTO v_title
    FROM titles t
    WHERE t.image_id = $1;
 
    SELECT d."text"
    INTO v_description
    FROM descriptions d
    WHERE d.image_id = $1;
 
    SELECT ARRAY_AGG(tg."name")
    INTO v_tags
    FROM tags tg
    WHERE tg.image_id = $1;
 
    meta := jsonb_build_object(
        'views', v_views,
        'ups', v_ups,
        'downs', v_downs,
        'title', v_title,
        'description', v_description,
        'tags', v_tags
    );

    RETURN meta;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION get_full_image_data(image_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    imgur_meta JSONB;
    image_comments JSONB;
    full_data JSONB;
BEGIN
    imgur_meta := get_imgur_meta_data(image_id);
    
    image_comments := get_image_comments(image_id);
    
    full_data := jsonb_build_object(
        'details', imgur_meta,
        'comments', image_comments
    );

    RETURN full_data;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION filter_ids_by_tags(
    p_ids  INTEGER[],
    p_tags TEXT[]
) RETURNS INTEGER[] AS $$
DECLARE
    v_filtered_ids INTEGER[] := '{}';
    v_image_id INTEGER;
    v_tag_count INTEGER;
BEGIN
    FOREACH v_image_id IN ARRAY p_ids LOOP
        v_tag_count := 0;

        FOR i IN 1 .. array_length(p_tags, 1) LOOP
            PERFORM 1
            FROM   tags t
            WHERE  t.image_id = v_image_id
            AND    t.name ILIKE '%' || p_tags[i] || '%';

            IF FOUND THEN
                v_tag_count := v_tag_count + 1;
            END IF;
        END LOOP;

        IF v_tag_count = array_length(p_tags, 1) THEN
            v_filtered_ids := array_append(v_filtered_ids, v_image_id);
        END IF;
    END LOOP;

    RETURN v_filtered_ids;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION filter_ids_by_type(
    p_ids  INTEGER[],
    p_type TEXT
) RETURNS INTEGER[] AS $$
DECLARE
    v_filtered_ids INTEGER[] := '{}';
    v_image_id INTEGER;
BEGIN
    FOREACH v_image_id IN ARRAY p_ids LOOP
        PERFORM 1
        FROM   images
        WHERE  id = v_image_id
        AND    type = p_type;

        IF FOUND THEN
            v_filtered_ids := array_append(v_filtered_ids, v_image_id);
        END IF;
    END LOOP;

    RETURN v_filtered_ids;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION filter_ids_by_title(
    p_ids  INTEGER[],
    p_title TEXT
) RETURNS INTEGER[] AS $$
DECLARE
    v_filtered_ids INTEGER[] := '{}';
    v_image_id INTEGER;
BEGIN
    FOREACH v_image_id IN ARRAY p_ids LOOP
        IF EXISTS (
            SELECT 1
            FROM titles
            WHERE image_id = v_image_id
            AND text ILIKE '%' || p_title || '%'
        ) THEN
            v_filtered_ids := array_append(v_filtered_ids, v_image_id);
        END IF;
    END LOOP;

    RETURN v_filtered_ids;
END;
$$ LANGUAGE plpgsql;
 

CREATE OR REPLACE FUNCTION filter_ids(
    p_ids INTEGER[],
    p_tags TEXT[] DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_title TEXT DEFAULT NULL
) RETURNS INTEGER[] AS $$
DECLARE
    v_filtered_ids INTEGER[];
BEGIN
    v_filtered_ids := p_ids;

    IF p_tags IS NOT NULL AND array_length(p_tags, 1) > 0 THEN
        v_filtered_ids := filter_ids_by_tags(v_filtered_ids, p_tags);
    END IF;

    IF p_type IS NOT NULL AND p_type <> '' THEN
        v_filtered_ids := filter_ids_by_type(v_filtered_ids, p_type);
    END IF;

    IF p_title IS NOT NULL AND p_title <> '' THEN
        v_filtered_ids := filter_ids_by_title(v_filtered_ids, p_title);
    END IF;

    RETURN v_filtered_ids;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION update_image_meta_data(
    p_image_id INTEGER,
    new_title TEXT,
    new_tags TEXT[]
)
RETURNS VOID AS $$
DECLARE
    existing_title_exists BOOLEAN;
    existing_tags_exist BOOLEAN;
    tag_name TEXT; -- Declare a variable to hold each tag name
BEGIN 
    -- Check if the title already exists
    SELECT EXISTS(
        SELECT 1 FROM titles WHERE image_id = p_image_id
    ) INTO existing_title_exists;
    
    -- Check if tags already exist
    SELECT EXISTS(
        SELECT 1 FROM tags WHERE image_id = p_image_id
    ) INTO existing_tags_exist;

    -- Delete existing title if it exists
    IF existing_title_exists THEN
        DELETE FROM titles WHERE image_id = p_image_id;
    END IF;
    
    -- Delete existing tags if they exist
    IF existing_tags_exist THEN
        DELETE FROM tags WHERE image_id = p_image_id;
    END IF;

    -- Insert new title
    INSERT INTO titles (image_id, "text") VALUES (p_image_id, new_title);

    -- Insert new tags
    FOREACH tag_name IN ARRAY new_tags LOOP
        INSERT INTO tags (image_id, "name") VALUES (p_image_id, tag_name);
    END LOOP;
    
END;
$$ LANGUAGE plpgsql;
