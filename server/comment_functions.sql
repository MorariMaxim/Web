

CREATE OR REPLACE FUNCTION get_comment_tree(comment_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    comment JSONB;
BEGIN
    
    SELECT jsonb_build_object(
        'author', c.author,
        'text', c.text,
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
                                   'text', (SELECT text FROM comments WHERE id = comment_id),
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
    VALUES (comment_json->>'author', comment_json->>'text')
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
